---
title: 检查cug校园网的dhcp
date: 2024-09-04 22:28:24
tags:
  - web
  - dhcp
  - cug
  - 树莓派
---

> 废话：又回到校园网的环境了。今年学校终于推出了逃开校园卡的校园网套餐。办理下来体验很好，最重要的是，好像被我玩到正版校园网了！之前的公网网段是59.73.207.\*，然后现在变成了59.71.244.\*。后者网上查到的实名~~开盒~~信息确实是我们学校，前者是一个广东的什么学校。总之，现在我是高贵的教育网用户。

可惜，我的校园网似乎对于服务器非常不友好。认证页几乎只能通过浏览器实现。这种情况下我比较推荐使用`X11`+`ssh`在本地pc上渲染。

但问题是他经常掉认证。解决方法是使用设备`mac`实名上网。我们学校的校园网后台能够自己添加3条`mac`记录。by the way，我的设备是树莓派5 `ubuntu` 24。

问题出在`dhcp`上，每一次用着用着没网了，重启，又网了，但发现`ip`变了。我使用`ddns`记录倒是没事，但这导致重启时间有些难以接受。现在一眼顶真就是`dhcp`没固定还是怎么地，正好来学习一下相关知识。

首先是确实自己的地址是通过`dhcp`得到的，可以通过以下命令：

```bash
ip a
```

然后在对应网络设备的大概第三行：

```\\
inet 172.30.32.245/16 metric 600 brd 172.30.255.255 scope global dynamic wlan0
```

其中的`scope global dynamic wlan0`表示这是通过`dhcp`获取的。

首先，思路都是使用一个抓包工具关注网络设备上的包。一个`dhcp`客户端来重新续约或者毁约`dhcp`。假如直接问`gpt`，他会给你推荐`dhclient`，但这在我的`ubuntu 24`上行不通。原因是我的服务器版`ubuntu`使用`systemd`进行管理，上层接口是`netplan`。我推荐不管是服务器版还是桌面版都是用`netplan`。

在开始之前，先启动`tcpdump`抓包：

```bash
sudo tcpdump -i wlan0 -n port 67 or port 68 -vvv -w dhcp.pcap
```

其中

* `-i`指定网络设备
* `n`表示不进行DNS解析
* `port 67 or port 68`表示监听这两个端口。这是`dhcp`的服务端和客户端使用的端口。
* `-vvv`表示三倍`verbose`，非常详细的输出。
* `-w dhcp.pcap`将结果输出到这个文件当中

直接运行它会阻塞当前的终端，其实我们最好使用`nohup`让他在后台运行。因为`dhcp`行为有可能会得到一个新的`ip`，然后`ssh`连接就断掉了。现在新开一个终端。然后关注`netplan`。使用以下命令得到一个很高级的`ip`输出：

```bash
$ netplan status wlan0 --all
     Online state: online
    DNS Addresses: 127.0.0.53 (stub)
       DNS Search: .

●  3: wlan0 wifi UP (networkd: wlan0)
      MAC Address: 2c:cf:67:36:6c:e1
        Addresses: 172.30.209.213/16 (dhcp)
                   fe80::2ecf:67ff:fe36:6ce1/64 (link)
    DNS Addresses: 202.114.200.251
                   202.114.200.250
           Routes: default via 172.30.255.254 from 172.30.209.213 metric 600 (dhcp)
                   172.30.0.0/16 from 172.30.209.213 metric 600 (link)
                   172.30.255.254 from 172.30.209.213 metric 600 (dhcp, link)
                   202.114.200.250 via 172.30.255.254 from 172.30.209.213 metric 600 (dhcp)
                   202.114.200.251 via 172.30.255.254 from 172.30.209.213 metric 600 (dhcp)
                   fe80::/64 metric 256
```

使用以下命令查看当前生效的配置文件：

```bash
$ sudo netplan get
network:
  version: 2
  wifis:
    wlan0:
      optional: true
      dhcp4: true
      macaddress: <一段mac地址>
      access-points:
        "CUG": {}
```

> 这是CUG校园网的配置文件，关于更加细节的配置：https://netplan.readthedocs.io/en/stable/examples/

然后理论上运行以下命令就可以进行一次`dhcp`发现之类的操作。

```bash
sudo netplan apply
```

然后，使用以下命令查看`tcpdump`抓包的内容：

```bash
sudo tcpdump -r dhcp.pcap -vvv -n
```

其中在输出中理论上可以看到有我们向广播地址发送了几次`BOOTP/DHCP, Request`这样的请求。第一个请求应该长这样：

```pcap
17:40:34.726372 IP (tos 0xc0, ttl 64, id 31929, offset 0, flags [DF], proto UDP (17), length 293)
    murpi.bootpc > _gateway.bootps: [udp sum ok] BOOTP/DHCP, Request from <设备mac> (oui Unknown), length 265, xid 0xe7c51c4, secs 1419, Flags [none] (0x0000)
      Client-IP <主机名称>
      Client-Ethernet-Address <设备mac> (oui Unknown)
      Vendor-rfc1048 Extensions
        Magic Cookie 0x63825363
        DHCP-Message (53), length 1: Release
        Client-ID (61), length 19: hardware-type 255, aa:2a:a0:93:00:02:00:00:ab:11:94:70:41:b6:ba:7d:b9:8a
        END (255), length 0
```

但我们只关心`dhcp`的内容也就是这样：

```pcap
Client-IP murpi
Client-Ethernet-Address <设备mac> (oui Unknown)
Vendor-rfc1048 Extensions
Magic Cookie 0x63825363
DHCP-Message (53), length 1: Release
Client-ID (61), length 19: hardware-type 255, aa:2a:a0:93:00:02:00:00:ab:11:94:70:41:b6:ba:7d:b9:8a
END (255), length 0
```

其中`DHCP-Message`标注了这个请求的类型。现在是释放，表示当前`ip`从已占用变为可分配。根据[`wiki`的描述][^1][^1]，`dhcp`有大概5种报文类型，相信读者已经点进了这个连接并看得懂下面的内容。

其实到这一步就可以大概解决我的问题了。我们可以看到这个`dhcp`其实租约很短，只有2个小时（Offer报文）。

**又强调一遍`ubuntu`服务器版使用`systemd`管理网络；**网上大部分教程都没有很明确的区分这一点。

现在解决问题有两个思路，一是向服务器修改`dhcp`租约期限。我失败了，因为这中办法只有在`dhcp`服务器上设置一个很高的上线的时候我们才有可能成功。当然我还是贴在这里，不浪费更多`token`了。

有两个可能生效的配置地点，一个是在`/etc/systemd/network/10-<interface>.network`填写：

```toml
[DHCP]
RequestLeaseTimeSec=86400  # 请求 24 小时（秒）的租约时间
```

另一个是在`/etc/dhcp/dhclient.conf`你大概率可以找到这一行，他是被注释的。解除注释：

```conf
send dhcp-lease-time 86400;
```

另一个思路就是找一个守护程序，他在租约期间主动的检查网络环境是否正常。因为我怀疑设备会在`dhcp`开始续约之前服务器自己注销了这个`ip`。我的计划是写一个程序一边监控`dhcp`相关的数据包，一边监控公网的访问情况。事后分析一下重新被分配`ip`是否如我猜想的那样，服务器自己记录了一个更短的租约时间。到时候通过这个工具得到真正的`dhcp`租约就解决了这个问题。

本文的内容到这里就结束了，代码的内容详见：

> 写在最后，给在南望山校区的同学们。之前和老师确认，每个账号只能运行3台设备同时使用；我自己在后台尝试确认只能手动绑定3条MAC；但老师告诉我，在他们的后台，每个账号可以绑定5条MAC。

[^1]: https://zh.wikipedia.org/wiki/%E5%8A%A8%E6%80%81%E4%B8%BB%E6%9C%BA%E8%AE%BE%E7%BD%AE%E5%8D%8F%E8%AE%AE "wiki-动态主机设置协议"
