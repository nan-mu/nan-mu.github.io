# Nan Mu's Blog

这是我的个人博客站点，基于 [Zola](https://www.getzola.org/) 静态站点生成器构建，使用 [Radion](https://github.com/nan-mu/radion) 主题。

**站点地址**: [https://nan-mu.asia](https://nan-mu.asia)

## 技术栈

- **静态站点生成器**: [Zola](https://www.getzola.org/)
- **主题**: [Radion](https://github.com/nan-mu/radion)
- **部署**: GitHub Pages
- **评论**: Giscus

## 本地开发

### 环境要求
- [Zola](https://www.getzola.org/documentation/getting-started/installation/)

### 快速开始
```bash
# 克隆仓库
git clone https://github.com/nan-mu/nan-mu.github.io.git
cd nan-mu.github.io

# 初始化主题
git submodule update --init --recursive

# 本地预览
zola serve
```

访问 `http://127.0.0.1:1111` 预览站点

## 项目结构

```
├── config.toml          # 站点配置
├── content/             # 文章内容
├── static/              # 静态文件
├── themes/radion/       # 主题
└── README.md
```

## 联系

- **GitHub**: [@nan-mu](https://github.com/nan-mu)
- **博客**: [https://nan-mu.asia](https://nan-mu.asia)
