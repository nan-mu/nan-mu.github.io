+++
title = "step-ca: 自拓管CA教程"
date = 2024-09-04 22:28:24

[taxonomies]
categories = ["tutorial"]
tags = ["network", "homelab"]
+++

用域名定向到局域网内你喜欢的web服务很好，有个小缺点是一旦在公司内网或校园网下这也将将你的服务暴露给其他人。万一，某天同事心血来潮对你进行http攻击就不好了。https将解决这一问题，我使用step-ca在mac os上加密了我的树莓派上所有的服务，它们运行地很好，希望这也能帮到你

<!-- more -->