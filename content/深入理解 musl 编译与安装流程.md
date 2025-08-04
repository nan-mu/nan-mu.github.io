+++
title = "深入理解 musl 编译与安装流程：从源码到自动化"
date = 2024-08-18 17:12:31

[taxonomies]
categories = ["demo"]
tags = ["compiler", "musl", "docker"]
+++

最近终于有时间处理一些历史遗留问题，于是有了这篇文章。我的目标是彻底掌握如何从零编译并安装一个纯净的 musl 工具链，并顺便梳理整个流程，方便后续自动化和多架构适配。

<!-- more -->

## 目标与动机

我希望自己能够独立完成编译和安装一个高纯度的编译工具链，主要解决以下“套娃”问题：

- 使用简单的`gcc`+`glibc`编译`musl`和`llvm`，下面称为直接编译
- 使用自己编译的`musl`+`llvm`编译`musl`+`llvm`（静态+动态），下面成为交叉编译


这么做一方面是出于技术好奇，另一方面也想锻炼自己对 C 项目的动手能力。除了上述目标，我还计划编译出多架构的原生工具链，主要在 `x86` 和 `aarch64` 上交叉编译其他目标。


最终，我希望得到一个类似 `.deb` 包中的 `data.tar` 文件，只需在系统目录下解压即可完成“非安全”的安装。因为在嵌入式 Linux 环境中，常常没有 `make` 等工具，系统的最小要求就是实现了 busybox（除网络外的大部分功能）。


> 注：这里的“非安全”安装与交叉工具链的概念有所区分。

<!-- ![image-20240818193647589](image-20240818193647589.png) -->


## 获取 musl 源码

musl 官方源码仓库在这里[^1]，有 `release` 分支和多个版本标签。本文编写时最新的版本为 `v1.2.5`。拉取源码命令如下：

```bash
git clone -b rs-1.0 git://git.musl-libc.org/musl musl-release
git clone -b master git://git.musl-libc.org/musl musl-1.2.5
```

这两者的编译流程基本一致。musl 编译的关键在于根目录下的脚本。为了更好地理解流程，我专门翻译了该脚本的注释和输出，详见我的仓库[^2]。建议有兴趣的朋友抽空阅读，语言不再是障碍。

## 编译流程概览

我的编译方式是在 musl 源码目录下新建 `build` 文件夹，并在其中运行：

```shell
../configure
```

此时 `build` 文件夹下结构如下：

```bash
tree .
```

其中 `config.mak` 记录了所有配置变量。如果后文遇到不明所以的 `$xxx`，大概率都能在这里找到。编译前可在此做最后检查。然后在该目录下执行：

```bash
make # 或者使用多任务编译 make -j
```

编译完成后，当前目录会多出 `lib` 和 `obj` 文件夹。接下来重点关注安装行为：

```bash
# 因为直接使用make install实际上会触发all规则，但我们实际上只关注install规则的细节，所以使用diff得到两个命令的差集；其中grep -E是使用拓展正则表达式，表达式的意思是只匹配小于开头或者大于开头的行，过滤了diff的行号信息
diff <(make -nB) <(make install -nB) | grep -E "^<|^>" > install.sh
```

通过阅读命令输出可知，安装操作由 `tools/install.sh` 脚本完成。其主要逻辑如下：

- `lib`文件夹复制到了`$prefix/lib`
  - 除开`libc.so`的权限是755，其他都是644
  - 尝试创建`libc.so`到`/lib/ld-musl-x86_64.so.1`的软连接

- 将源码中的`include`中几乎所有的.h文件复制到了`$prefix/include`
- 将`obj`中的一些头文件也复制到了`$prefix/include`
  - 看名字，这类头文件和架构强相关
- 将源码的`arch`文件夹下的一些`.h`文件复制到了`$prefix/include`
- 复制了一个`musl-gcc`脚本，用来更方便的使用`musl`编译，看起来内置了`$prefix`所以安装在哪里都可以。

## 自动化与后续计划

有了上述内容，可以先在空白环境下用 `make install` 安装一次，再根据需要替换不同架构。但如果只是手动做一遍，那就只是“手动做了一遍”🐶。我的下一步计划是编写 GitHub Action，自动编译各种奇奇怪怪架构的工具链。

本教程到此为止，musl 的细节已经掌握得差不多了。接下来就是薅赛博大善人的羊毛！

[^1]: <https://git.musl-libc.org/cgit/musl> "musl官方git仓库"

[^2]: <https://github.com/nan-mu/musl-learning> "翻译编译脚本的仓库"
