# 使用官方 Node.js LTS 版本的 Alpine 镜像作为基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /workspace

# 安装 Yarn 包管理器
# 使用官方安装脚本安装最新版本的 Yarn
RUN corepack enable && corepack prepare yarn@stable --activate

# 全局安装 Hexo CLI
RUN yarn global add hexo-cli

# 将 Yarn 全局安装路径添加到 PATH
ENV PATH=/workspace/node_modules/.bin:$PATH

# 暴露 Hexo 默认的端口（可选）
EXPOSE 4000

# 默认启动命令为 bash（可选，方便进入容器）
CMD ["sh"]
