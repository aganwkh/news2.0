
/**
 * Content Cleaner Service
 * 负责将脏乱的 HTML/RSS 内容清洗为干净、适合 AI 阅读的纯文本。
 */

// 垃圾标签黑名单：直接移除这些元素及其内容
const REMOVE_TAGS = [
    'script', 'style', 'noscript', 'iframe', 'svg', 'button', 'input', 'select', 'textarea', 
    'nav', 'footer', 'header', 'aside', 'form', 'img', 'video', 'source'
];
  
// 优先提取的选择器（模拟 Readability 的逻辑）
const CONTENT_SELECTORS = [
    'article',
    '[itemprop="articleBody"]',
    '.article-content',
    '.entry-content',
    '.post-content',
    '.rich_media_content', // 微信公众号
    '#content',
    '.main-content',
    '.content'
];

// 废话行关键词（正则清洗）
const NOISE_PATTERNS = [
    /查看次数|阅读量|Viewed by|Read count/i,
    /^来源[：:]/i,
    /^作者[：:]/i,
    /^发布时间[：:]/i,
    /^Posted on/i,
    /版权所有|All Rights Reserved|Copyright/i,
    /点击这里|点击阅读|Read more|Read full|全文阅读/i,
    /关注我们|Subscribe/i,
    /相关阅读|推荐阅读|Related posts/i,
    /分享到|Share to/i
];

/**
 * 主入口：清洗 HTML 文本
 */
export function cleanArticleContent(rawHtml: string): string {
    if (!rawHtml) return '';

    // 1. 解析 HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');

    // 2. 移除垃圾标签
    REMOVE_TAGS.forEach(tag => {
        const elements = doc.querySelectorAll(tag);
        elements.forEach(el => el.remove());
    });

    // 3. 智能提取正文 (Readability Lite)
    let root: Element = doc.body;
    for (const selector of CONTENT_SELECTORS) {
        const element = doc.querySelector(selector);
        if (element) {
            root = element;
            break;
        }
    }

    // 4. 转换文本（保留段落结构）
    // 使用自定义遍历而不是 innerText，因为 innerText 会丢失部分换行逻辑
    let text = extractTextWithFormatting(root);

    // 5. 深度正则清洗
    return postProcessText(text);
}

/**
 * 递归提取文本，将块级元素转换为换行符
 */
function extractTextWithFormatting(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
    }

    const el = node as Element;
    let result = '';

    // 处理子节点
    el.childNodes.forEach(child => {
        result += extractTextWithFormatting(child);
    });

    // 在块级元素后追加换行，模拟自然段落
    const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BR', 'TR', 'SECTION', 'ARTICLE'];
    if (blockTags.includes(el.tagName)) {
        result += '\n';
        // 段落之间多加一个换行，便于正则处理
        if (el.tagName === 'P') result += '\n';
    }

    return result;
}

/**
 * 后处理：按行清洗噪音
 */
function postProcessText(text: string): string {
    const lines = text.split('\n');
    const cleanLines: string[] = [];

    for (let line of lines) {
        line = line.trim();

        // 0. 跳过空行
        if (!line) continue;

        // 1. 去除原始 URL 行
        // 逻辑：以 http/https 开头，且该行不包含中文字符（\u4e00-\u9fa5），视为纯链接噪音
        // 允许行内包含链接，但不允许整行就是个长链接
        if (/^https?:\/\//i.test(line)) {
             const hasChinese = /[\u4e00-\u9fa5]/.test(line);
             // 如果没有中文，且长度超过 15 (大概率是网址)，或者是单纯的 URL
             if (!hasChinese && (line.length > 15 || !line.includes(' '))) {
                 continue;
             }
        }

        // 2. 去除元数据和废话
        let isNoise = false;
        for (const pattern of NOISE_PATTERNS) {
            if (pattern.test(line)) {
                isNoise = true;
                break;
            }
        }
        if (isNoise) continue;

        // 3. 长度过短的非中文行（往往是导航菜单残留），如 "Home", "Menu", ">"
        if (!/[\u4e00-\u9fa5]/.test(line) && line.split(' ').length < 3 && line.length < 20) {
             // 保留可能的代码片段或短语，但过滤明显的导航词
             if (/^(Home|Menu|Top|Back|Next|Previous|Log in|Sign up)$/i.test(line)) continue;
        }

        cleanLines.push(line);
    }

    // 4. 重组段落，确保段落间有且仅有一个空行
    return cleanLines.join('\n\n');
}
