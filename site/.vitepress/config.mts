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
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        nav: [
            { text: 'Home', link: '/' },
            { text: 'List', link: '/markdown-examples' }
        ],
        sidebar: [
            {
                text: 'Examples',
                items: [
                    { text: 'Markdown Examples', link: '/markdown-examples' },
                    { text: 'Runtime API Examples', link: '/api-examples' }
                ]
            }
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
