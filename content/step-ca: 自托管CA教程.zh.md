+++
title = "step-ca: 自拓管CA教程"
date = 2024-09-04 22:28:24
+++

<施工中🚧>
用域名定向到局域网内你喜欢的web服务很好，有个小缺点是一旦在公司内网或校园网下这也将将你的服务暴露给其他人。万一，某天同事心血来潮对你进行http攻击就不好了。https将解决这一问题，我使用step-ca在mac os上加密了我的树莓派上所有的服务，它们运行地很好，希望这也能帮到你

<!-- more -->

我的的目标是通过域名指向一台树莓派上的所有服务，但有点特殊的是我希望为两个网段上都签发各自的证书。比如在`192.168.2.x`上的域名是*.moonrpi.asia，在`172.168.x`上的域名是*.xxx.moonrpi.asia。因为前者是交换机设备的网段后者是公共wifi的网段。理论上应该有办法使用一个域名自动找到最佳ip，但我现在不打算做，我还不知道如何做。

在我的网络中，有一台mac mini连接外网并且连接交换机。所以我将它作为ca服务器，也就是运行step-ca。所以第一步应该安装step-ca，我建议参考[这里](https://smallstep.com/docs/step-ca/installation/)以适应不同平台。但你首先应该明白一些事。

CA的作用是给其他服务签发证书，在这个过程中只会用到这些：

- 根证书`root_ca.crt`，这是服务器的公钥[^1]。你需要下载到你，使用https的客户端中。比如你给你的jellyfin服务器安装了https证书，那`root_ca.crt`应该安装在访问它的地方，当然，这是使用https的一种方法，我使用它，它相对简单。但要注意，他的内容没有受到任何`担保`。
- 中间密钥[^2]`intermediate_ca.key`。可以理解为，CA信任一台设备（可以是下级CA或服务器），所以给他一个中间证书来签发自己的服务器证书，或者用它在CA自己的服务器签发，总之，直接用根证书签发是可能的，但不常见。
- 服务器密钥`server.key`。这是服务器给自己的证明，主要是用来加密服务器证书。使用中间密钥和服务器密钥（当然如果证书有密码那还是没法避免的）就是设置https所需的一切。
- 中间证书`intermediate_ca.crt`和服务器证书`server.crt`。前者CA得到，后者通过中间密钥和服务器密钥签发。它们两者构成了认证链（`fullchain`）。当用户的请求发到服务器后，服务器返回这两个证书和它们的签名。而根证书可以认证这些信息是否真实。
- 服务器密钥`server.key`，这是签名后的产物，只会放在服务器中，用于加密信息给客户端的公钥解密。

所以颁发证书的过程就是以下几步：

1. 提供`server.key`和`intermediate_ca.key`和必要信息得到`server.crt`
1. 将`sercer.crt`和`intermediate_ca.crt`合成`fullchain.crt`
2. 在你的web服务或反向代理中添加`fullchain.crt`和`server.key`

## 得到`intermediate_ca`



现在我要给我局域网上的服务用局域网上的ca颁发https证书。ca在mac上，ip是192.168.2.1。服务器是linux，使用caddy，有多个ip。我需要颁发的域名如下：
这些给ip:172.30.15.104
alist.cug.moonrpi.asia
ani.cug.moonrpi.asia
ani-qbit.cug.moonrpi.asia
bc.cug.moonrpi.asia
ddns.cug.moonrpi.asia
jelly.cug.moonrpi.asia
pbh.cug.moonrpi.asia
qbit.cug.moonrpi.asia

这些给ip192.168.2.2

alist.moonrpi.asia
ani.moonrpi.asia
ani-qbit.moonrpi.asia
bc.moonrpi.asia
jelly.moonrpi.asia
pbh.moonrpi.asia
qbit.moonrpi.asia
ddns.moonrpi.asia

你首先应该将这些ip生成一个tokens，然后又tokens得到服务器证书。然后将中间证书和服务器证书混合得到完整证书链。这些操作应该在服务器上进行，服务器上已经有中间证书和密钥。

```bash
# 生成一个新的私钥 (2048位)
openssl genpkey -algorithm RSA -out server-172.30.15.104.key -pkeyopt rsa_keygen_bits:2048
openssl genpkey -algorithm RSA -out server-192.168.2.2.key -pkeyopt rsa_keygen_bits:2048

# 列出 172.30.15.104 对应的域名和 IP
SAN_172="DNS:alist.cug.moonrpi.asia, DNS:ani.cug.moonrpi.asia, DNS:ani-qbit.cug.moonrpi.asia, DNS:bc.cug.moonrpi.asia, DNS:ddns.cug.moonrpi.asia, DNS:jelly.cug.moonrpi.asia, DNS:pbh.cug.moonrpi.asia, DNS:qbit.cug.moonrpi.asia, IP:172.30.15.104"

# 使用私钥和 SAN 扩展生成 CSR
openssl req -new -key server-172.30.15.104.key -out server-172.30.15.104.csr \
-subj "/CN=cug.moonrpi.asia-services/O=MoonRPI/L=Local/C=CN" \
-addext "subjectAltName=$SAN_172"

# 列出 192.168.2.2 对应的域名
SAN_192="DNS:alist.moonrpi.asia, DNS:ani.moonrpi.asia, DNS:ani-qbit.moonrpi.asia, DNS:bc.moonrpi.asia, DNS:jelly.moonrpi.asia, DNS:pbh.moonrpi.asia, DNS:qbit.moonrpi.asia, DNS:ddns.moonrpi.asia, IP:192.168.2.2"

# 使用私钥和 SAN 扩展生成 CSR
openssl req -new -key server-192.168.2.2.key -out server-192.168.2.2.csr \
-subj "/CN=moonrpi.asia-services/O=MoonRPI/L=Local/C=CN" \
-addext "subjectAltName=$SAN_192"

# 1. 在 Linux 服务器上（如果之前没有，重新设置 SAN 变量）
SAN_172="DNS:alist.cug.moonrpi.asia, DNS:ani.cug.moonrpi.asia, DNS:ani-qbit.cug.moonrpi.asia, DNS:bc.cug.moonrpi.asia, DNS:ddns.cug.moonrpi.asia, DNS:jelly.cug.moonrpi.asia, DNS:pbh.cug.moonrpi.asia, DNS:qbit.cug.moonrpi.asia, IP:172.30.15.104"

# 2. 将扩展配置写入一个临时文件 (e.g., san_config_172.ext)
echo "subjectAltName=$SAN_172" > san_config_172.ext
echo "extendedKeyUsage=serverAuth" >> san_config_172.ext

# 在 macOS CA 上执行签名命令
openssl x509 -req -in server-172.30.15.104.csr \
    -CA intermediate_ca.crt -CAkey intermediate_ca.key \
    -CAcreateserial -out server-172.30.15.104.crt \
    -days 3650 -sha256 \
    -extfile san_config_172.ext

# 构建 172.30.15.104 的证书链
cat server-172.30.15.104.crt intermediate_ca.crt > fullchain-172.30.15.104.pem

# 构建 192.168.2.2 的证书链
cat server-192.168.2.2.crt intermediate_ca.crt > fullchain-192.168.2.2.pem
```

## 参考 

[^1]: 非对称加密 https://zh.wikipedia.org/wiki/%E5%85%AC%E5%BC%80%E5%AF%86%E9%92%A5%E5%8A%A0%E5%AF%86
[^2]: 中间证书 https://www.ssldragon.com/zh/blog/root-intermediate-certificate/
