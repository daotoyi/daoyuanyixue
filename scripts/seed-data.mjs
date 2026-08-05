/**
 * 生成 CloudBase 种子数据 JSON 文件
 * 输出: /tmp/dy-seed/<collection>.json (每行一个文档)
 */
import { writeFileSync, mkdirSync } from 'fs'

const P = '/static/placeholder/'

const seed = {
  categories: [
    { id: 1, name: '开运饰品', icon: 'sparkles', image: `${P}product-01.png` },
    { id: 2, name: '香薰禅修', icon: 'fire', image: `${P}product-02.png` },
    { id: 3, name: '文房雅器', icon: 'edit-pen', image: `${P}product-03.png` },
    { id: 4, name: '茶道器具', icon: 'gift', image: `${P}product-04.png` },
    { id: 5, name: '风水摆件', icon: 'star', image: `${P}product-05.png` },
    { id: 6, name: '服饰配件', icon: 'shopping-bag', image: `${P}product-06.png` },
    { id: 7, name: '书籍经典', icon: 'book', image: `${P}product-07.png` },
  ],
  products: [
    { id: 1, name: '天然朱砂手串', price: '168.00', ot_price: '228.00', images: [`${P}product-01.png`, `${P}product-02.png`], cate_id: 1, sales: 326, stock: 50, description: '天然朱砂打磨，辟邪安神，佩戴清心。', attrs: { 材质: '天然朱砂', 珠径: '8mm', 重量: '约 25g' } },
    { id: 2, name: '小叶紫檀念珠', price: '398.00', ot_price: '498.00', images: [`${P}product-02.png`], cate_id: 1, sales: 189, stock: 30, description: '印度小叶紫檀，油性充足，盘玩包浆快。', attrs: { 材质: '小叶紫檀', 珠径: '10mm', 颗数: '108 颗' } },
    { id: 3, name: '檀香线香礼盒', price: '88.00', ot_price: '108.00', images: [`${P}product-03.png`], cate_id: 2, sales: 542, stock: 120, description: '天然檀香，安神助眠，禅修佳品。', attrs: { 香型: '老山檀', 规格: '10g × 3 筒' } },
    { id: 4, name: '铜鎏金莲花香炉', price: '268.00', ot_price: '328.00', images: [`${P}product-04.png`], cate_id: 2, sales: 96, stock: 20, description: '铜鎏金工艺，莲花造型，焚香礼佛。', attrs: { 材质: '黄铜鎏金', 尺寸: '口径 12cm' } },
    { id: 5, name: '端砚文房四宝', price: '458.00', ot_price: '598.00', images: [`${P}product-05.png`], cate_id: 3, sales: 64, stock: 15, description: '广东端砚，砚台+墨+笔+纸，文房雅器。', attrs: { 材质: '端石', 套装: '四件套' } },
    { id: 6, name: '竹雕镇纸一对', price: '128.00', ot_price: '168.00', images: [`${P}product-06.png`], cate_id: 3, sales: 152, stock: 40, description: '手工竹雕，刻般若波罗蜜多心经。', attrs: { 材质: '楠竹', 尺寸: '30cm' } },
    { id: 7, name: '宜兴紫砂壶', price: '688.00', ot_price: '888.00', images: [`${P}product-07.png`], cate_id: 4, sales: 45, stock: 8, description: '宜兴原矿紫砂，西施壶型，泡茶留香。', attrs: { 材质: '紫砂', 容量: '200ml' } },
    { id: 8, name: '青花盖碗茶具', price: '158.00', ot_price: '198.00', images: [`${P}product-08.png`], cate_id: 4, sales: 210, stock: 60, description: '景德镇青花，盖碗+茶盘+品茗杯。', attrs: { 产地: '景德镇', 套数: '5 件' } },
    { id: 9, name: '黄铜风水罗盘', price: '358.00', ot_price: '428.00', images: [`${P}product-09.png`], cate_id: 5, sales: 78, stock: 25, description: '专业风水罗盘，24 山向，铜质刻度精准。', attrs: { 材质: '黄铜', 直径: '7.2cm' } },
    { id: 10, name: '天然葫芦挂件', price: '66.00', ot_price: '88.00', images: [`${P}product-10.png`], cate_id: 5, sales: 356, stock: 100, description: '天然葫芦，寓意福禄，悬挂镇宅。', attrs: { 材质: '天然葫芦', 尺寸: '约 15cm' } },
    { id: 11, name: '棉麻禅修服', price: '198.00', ot_price: '258.00', images: [`${P}product-11.png`], cate_id: 6, sales: 132, stock: 45, description: '天然棉麻，宽松透气，禅修练功皆宜。', attrs: { 材质: '棉麻', 颜色: '米白/藏青' } },
    { id: 12, name: '帛书道德经注译', price: '88.00', ot_price: '118.00', images: [`${P}product-12.png`], cate_id: 7, sales: 468, stock: 200, description: '帛书版《道德经》逐章注译，附简体对照。', attrs: { 出版社: '华夏出版社', 页数: '420 页' } },
  ],
  course_categories: [
    { id: 1, name: '八字命理', description: '四柱推命，洞察天命', image: `${P}course-01.png` },
    { id: 2, name: '奇门遁甲', description: '奇门排盘，趋吉避凶', image: `${P}course-02.png` },
    { id: 3, name: '六爻预测', description: '摇卦断事，洞察先机', image: `${P}course-03.png` },
    { id: 4, name: '风水堪舆', description: '阴阳宅风水，藏风聚气', image: `${P}course-04.png` },
    { id: 5, name: '紫微斗数', description: '星曜排盘，命宫推演', image: `${P}course-05.png` },
  ],
  courses: [
    { id: 1, title: '八字入门 · 四柱推命基础', category_id: 1, teacher: '明德先生', price: '199.00', ot_price: '299.00', cover: `${P}course-01.png`, lessons_count: 24, students_count: 1280, level: '入门', description: '从零认识天干地支、十神旺衰，学会排盘与基础断法。' },
    { id: 2, title: '八字进阶 · 格局与用神', category_id: 1, teacher: '明德先生', price: '399.00', ot_price: '499.00', cover: `${P}course-02.png`, lessons_count: 32, students_count: 860, level: '进阶', description: '深入格局、用神、大运流年，提升断命精准度。' },
    { id: 3, title: '奇门遁甲 · 排盘起局实战', category_id: 2, teacher: '玄机子', price: '499.00', ot_price: '699.00', cover: `${P}course-03.png`, lessons_count: 40, students_count: 620, level: '进阶', description: '掌握奇门起局、九宫八门，趋吉避凶于日常。' },
    { id: 4, title: '六爻预测 · 摇卦断事入门', category_id: 3, teacher: '观复道人', price: '159.00', ot_price: '199.00', cover: `${P}course-04.png`, lessons_count: 18, students_count: 1540, level: '入门', description: '学会起卦装卦、六亲取用，断问事应期。' },
    { id: 5, title: '阳宅风水 · 居家布局要诀', category_id: 4, teacher: '静安居士', price: '299.00', ot_price: '399.00', cover: `${P}course-05.png`, lessons_count: 26, students_count: 980, level: '入门', description: '从峦头到理气，掌握家居布局的实用要诀。' },
    { id: 6, title: '紫微斗数 · 星曜命盘推演', category_id: 5, teacher: '紫垣先生', price: '349.00', ot_price: '449.00', cover: `${P}course-06.png`, lessons_count: 30, students_count: 720, level: '进阶', description: '十二宫、十四主星、四化飞星，完整命盘解读。' },
  ],
  moments: [
    { id: 1, user_id: 1, user_name: '明德先生', avatar: '', content: '今日观一命盘，丙火生于午月，火炎土燥，幸有壬水调候，贵格初显。学八字者，先明五行生克，再论格局高低。', images: [`${P}course-01.png`], likes: 128, comments: 23, is_recommended: true, created_at: '2026-08-04 09:30' },
    { id: 2, user_id: 2, user_name: '观复道人', avatar: '', content: '六爻起卦小贴士：心诚则灵。摇卦时心无杂念，默念所问之事，铜钱三枚六次，静候卦成。', images: [], likes: 86, comments: 15, is_recommended: true, created_at: '2026-08-04 08:12' },
    { id: 3, user_id: 3, user_name: '静安居士', avatar: '', content: '阳宅入门：入户门为纳气之口，宜明亮整洁。玄关设屏风，可缓冲气流，聚气藏风。', images: [`${P}course-05.png`, `${P}product-09.png`], likes: 203, comments: 41, is_recommended: true, created_at: '2026-08-03 21:45' },
    { id: 4, user_id: 4, user_name: '紫垣先生', avatar: '', content: '紫微斗数命宫星曜速查表已整理完毕，需要的同修留言。', images: [], likes: 310, comments: 67, is_recommended: false, created_at: '2026-08-03 15:20' },
  ],
  live_streams: [
    { id: 1, title: '《道德经》帛书逐章精讲 · 第一章', anchor: '明德先生', avatar: '', cover: `${P}live-01.png`, status: 'live', start_time: '2026-08-04 19:00', end_time: '2026-08-04 21:00', viewers: 342, description: '帛书版《道德经》逐章精讲，第一章「道可道，非常道」。', third_party_url: '' },
    { id: 2, title: '八字实战：婚姻情感案例解析', anchor: '玄机子', avatar: '', cover: `${P}live-02.png`, status: 'upcoming', start_time: '2026-08-05 20:00', end_time: '2026-08-05 22:00', viewers: 0, description: '现场排盘，解析婚姻情感类命例。', third_party_url: '' },
    { id: 3, title: '六爻答疑专场', anchor: '观复道人', avatar: '', cover: `${P}live-03.png`, status: 'ended', start_time: '2026-08-02 19:30', end_time: '2026-08-02 21:00', viewers: 156, description: '六爻预测答疑专场，回放可看。', third_party_url: '' },
  ],
  coupons: [
    { id: 1, name: '新人专享券', discount: '满 99 减 20', type: 'cash', status: 'valid', expire_at: '2026-12-31' },
    { id: 2, name: '老友回馈券', discount: '满 299 减 50', type: 'cash', status: 'valid', expire_at: '2026-12-31' },
  ],
  users: [
    { uid: 1, nickname: '明德先生', avatar: '', phone: '13800138001', password: '123456', vip_level: 2, balance: '100.00', role: 'admin', invite_code: 'ZHS8888', created_at: '2026-07-01' },
    { uid: 2, nickname: '观复道人', avatar: '', phone: '13800138002', password: '123456', vip_level: 1, balance: '50.00', role: 'user', invite_code: 'GFDR2026', created_at: '2026-07-05' },
    { uid: 3, nickname: '静安居士', avatar: '', phone: '13800138003', password: '123456', vip_level: 0, balance: '0.00', role: 'user', invite_code: 'JAJY8888', created_at: '2026-07-12' },
  ],
}

const OUT = '/tmp/dy-seed'
mkdirSync(OUT, { recursive: true })

for (const [name, docs] of Object.entries(seed)) {
  const lines = docs.map((d) => JSON.stringify(d)).join('\n')
  writeFileSync(`${OUT}/${name}.jsonl`, lines + '\n')
  console.log(`${name}: ${docs.length} docs`)
}
