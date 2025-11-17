+++
title = "检查cug校园网的dhcp"
date = 2024-09-04 22:28:24
+++

今年学校推出了无需校园卡的校园网套餐，体验良好。最重要的是，似乎接入了正版校园网！之前的公网网段是 59.73.207.*，现在变成了 59.71.244.*。经查询，后者的实名信息确实是我们学校，前者是广东某学校。现在终于成为了正式的教育网用户。

<!-- more -->

## 问题描述

不过，校园网对服务器设备不太友好。认证页面几乎只能通过浏览器访问，建议使用 `X11` + `ssh` 在本地 PC 上渲染。

更麻烦的是经常掉线失去认证。解决方案是使用设备 MAC 地址进行实名上网，学校校园网后台支持自行添加 3 条 MAC 记录。我使用的设备是树莓派 5 Ubuntu 24。

核心问题出现在 DHCP 上：使用过程中经常断网，重启后网络恢复，但 IP 地址发生了变化。虽然 DDNS 可以解决这个问题，但重启时间过长难以接受。初步判断是 DHCP 地址分配不稳定导致的，正好借此机会学习相关知识。

## 确认 DHCP 获取方式

首先确认地址是否通过 DHCP 获取，使用以下命令：

```bash
ip a
```

在对应网络设备信息的第三行左右可以看到类似输出：

```
inet 172.30.32.245/16 metric 600 brd 172.30.255.255 scope global dynamic wlan0
```

其中 `scope global dynamic wlan0` 表示此地址是通过 DHCP 获取的。

## 诊断思路

解决思路是使用抓包工具监控网络设备的数据包，配合 DHCP 客户端进行续约或释放操作。如果直接询问 GPT，通常会推荐 `dhclient`，但在 Ubuntu 24 上行不通。原因是服务器版 Ubuntu 使用 `systemd` 进行网络管理，上层接口是 `netplan`。无论服务器版还是桌面版，都建议使用 `netplan`。

## 开始抓包分析

首先启动 `tcpdump` 进行抓包：

```bash
sudo tcpdump -i wlan0 -n port 67 or port 68 -vvv -w dhcp.pcap
```

参数说明：
- `-i`：指定网络设备
- `-n`：不进行 DNS 解析
- `port 67 or port 68`：监听 DHCP 服务端和客户端端口
- `-vvv`：最详细的输出模式
- `-w dhcp.pcap`：将结果保存到文件

**重要提示**：直接运行会阻塞当前终端，建议使用 `nohup` 在后台运行。因为 DHCP 操作可能获得新 IP，导致 SSH 连接中断。

接下来在新终端中查看 `netplan` 状态。使用以下命令获取详细的 IP 信息：

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

查看当前生效的网络配置：

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

> 这是 CUG 校园网的配置文件，更详细的配置说明请参考：https://netplan.readthedocs.io/en/stable/examples/

## 触发 DHCP 操作

使用以下命令进行 DHCP 重新配置：

```bash
sudo netplan apply
```

## 分析抓包结果

使用以下命令查看抓包内容：

```bash
sudo tcpdump -r dhcp.pcap -vvv -n
```

在输出中应该能看到向广播地址发送的 `BOOTP/DHCP, Request` 请求。典型的第一个请求如下：

```
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

关键的 DHCP 信息部分：

```
Client-IP murpi
Client-Ethernet-Address <设备mac> (oui Unknown)
Vendor-rfc1048 Extensions
Magic Cookie 0x63825363
DHCP-Message (53), length 1: Release
Client-ID (61), length 19: hardware-type 255, aa:2a:a0:93:00:02:00:00:ab:11:94:70:41:b6:ba:7d:b9:8a
END (255), length 0
```

其中 `DHCP-Message` 标识了请求类型。此处是 Release（释放），表示当前 IP 从已占用变为可分配状态。根据 [Wiki 的描述][^1]，DHCP 大约有 5 种报文类型。

通过分析可以发现，DHCP 租约期很短，只有 2 个小时（见 Offer 报文）。

## 解决方案

**重申：Ubuntu 服务器版使用 systemd 管理网络**，网上大部分教程没有明确区分这一点。

解决问题有两个思路：

### 方案一：修改 DHCP 租约期限

这种方法只有在 DHCP 服务器设置了较高上限时才可能成功。尝试失败，但仍记录配置方法：

在 `/etc/systemd/network/10-<interface>.network` 中添加：

```toml
[DHCP]
RequestLeaseTimeSec=86400  # 请求 24 小时（秒）的租约时间
```

或者在 `/etc/dhcp/dhclient.conf` 中解除注释：

```conf
send dhcp-lease-time 86400;
```

### 方案二：主动监控网络状态

编写守护程序，在租约期间主动检查网络环境。怀疑服务器在 DHCP 开始续约之前就注销了该 IP。计划编写程序同时监控：
- DHCP 相关数据包
- 公网访问情况

通过事后分析确认重新分配 IP 的原因，获得真正的 DHCP 租约时间来解决问题。

## 总结

本文详细介绍了 CUG 校园网 DHCP 问题的诊断过程，代码实现部分将在后续文章中展示。

> **南望山校区同学注意**：据老师确认，每个账号可同时运行 3 台设备；后台手动绑定上限也是 3 条 MAC；但在他们的管理后台，每个账号实际可以绑定 5 条 MAC。

[^1]: https://zh.wikipedia.org/wiki/%E5%8A%A8%E6%80%81%E4%B8%BB%E6%9C%BA%E8%AE%BE%E7%BD%AE%E5%8D%8F%E8%AE%AE "wiki-动态主机设置协议"
