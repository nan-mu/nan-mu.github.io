import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "nan-mu's blog",
    lang: 'zh-CN',
    description: "技术学习记录",
    cleanUrls: true, // 更加简洁的URL（去除.html）
    lastUpdated: true, // 将md文件的git最后提交时间添加到元数据中
    sitemap: {
        hostname: "https://nan-mu.asia/"
    },
    markdown: {
        lineNumbers: true,
    },
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        nav: [
            { text: 'Home', link: '/' },
            { text: '学校报告', link: '/report-list' },
            { text: "阅读笔记", link: '/article-list' },
        ],
        socialLinks: [
            { icon: 'github', link: 'https://github.com/nan-mu' }
        ],
        search: {
            provider: "local"
        },
        logo: "./icon.svg",
        footer: {
            message: "MIT Lincense",
            copyright: "Copyright © 2024-present nan-mu.<br/>All rights reserved."
        }
    }
})
