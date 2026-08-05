/**
 * 八字 AI 解盘 (道元易学)
 * 基于八字特征规则生成结构化解读
 * - 免费: 六亲 / 健康
 * - 付费 9.9 元: 事业 / 财富 / 婚姻
 */
import { GAN, ZHI, ZHI_WX, GAN_WX, fullBazi, dayMasterStrength } from './paipan'

const WX = ['木', '火', '土', '金', '水']
const WX_ATTR = {
  木: '仁慈、向上、条理分明',
  火: '热情、明礼、积极进取',
  土: '诚信、稳重、包容务实',
  金: '刚毅、果断、重义气',
  水: '聪慧、灵动、善于变通',
}

function dayWx(f) {
  return GAN_WX[f.pillars[2].g]
}

function missingWx(f) {
  return WX.filter((w) => (f.wxCount[w] || 0) <= 0.5)
}

/* 六亲 (免费) */
export function jiepanLiuqin(f) {
  const ten = f.pillars.map((p) => p.ganShishen)
  const cg = f.pillars.map((p) => p.canggan.map((c) => c.shishen).filter((s, i, a) => a.indexOf(s) === i))
  const out = []
  out.push('八字十神显示：' + ten.join('、') + '。')
  // 印星 (母/长辈/贵人)
  const yin = ten.concat(...cg).filter((s) => s === '正印' || s === '偏印').length
  out.push(yin >= 2
    ? '印星较旺，长辈缘深，易得母亲与师长扶持，一生贵人相助明显。'
    : yin === 1
      ? '印星有根，早年得长辈关爱，中年后有贵人提携。'
      : '印星偏弱，凡事多靠自己打拼，长辈助力有限，宜自立自强。')
  // 比劫 (兄弟姐妹/朋友)
  const bi = ten.concat(...cg).filter((s) => s === '比肩' || s === '劫财').length
  out.push(bi >= 2
    ? '比劫有力，兄弟姐妹缘分浓，朋友义气重，社交圈广但易有分财之象。'
    : bi === 1
      ? '比劫适中，兄弟朋友感情和睦，遇事有同伴相帮。'
      : '比劫稀少，兄弟缘浅，朋友不多但贵在精，宜独当一面。')
  // 官杀 (子女/事业约束)
  const guan = ten.concat(...cg).filter((s) => s === '正官' || s === '七杀').length
  out.push(guan >= 2
    ? '官杀有力，子女出息，管理能力强，但责任感重、压力不小。'
    : guan === 1
      ? '官星清透，子女缘分不错，为人有原则，易得信任。'
      : '官杀较弱，子女缘分一般，事业上自我约束力偏弱，需自律。')
  // 财星 (配偶/父亲)
  const cai = ten.concat(...cg).filter((s) => s === '正财' || s === '偏财').length
  out.push(f.gender === '女'
    ? (cai >= 1 ? '财星（夫星）明透，感情缘分清晰，配偶缘佳。' : '财星暗藏，感情含蓄内敛，缘分较晚但稳定。')
    : (cai >= 2 ? '财星有力，配偶贤惠能干，婚后助力明显。' : '财星平和，婚恋平顺，宜细水长流。'))
  return out
}

/* 健康 (免费) */
export function jiepanHealth(f) {
  const dw = dayWx(f)
  const miss = missingWx(f)
  const out = []
  const map = { 木: '肝胆、筋骨、神经', 火: '心脏、血液、眼目', 土: '脾胃、肌肉、消化', 金: '肺、呼吸、皮肤、大肠', 水: '肾、膀胱、泌尿、耳' }
  out.push(`日主五行属${dw}，${WX_ATTR[dw]}。`)
  if (miss.length) {
    out.push(`八字中${miss.join('、')}偏弱${miss.length >= 2 ? '（明显缺失）' : ''}，建议关注：${miss.map((m) => map[m]).join('、')}。`)
    out.push('日常宜通过饮食作息补益相应五行：' + miss.map((m) => ({ 木: '多吃绿色蔬果、多运动', 火: '多晒太阳、调养心绪', 土: '规律三餐、养护脾胃', 金: '注意呼吸系统、常做深呼吸', 水: '多喝水、规律作息、养肾' })[m]).join('；') + '。')
  } else {
    out.push('五行流转相对均衡，整体健康底子较好，注意劳逸结合即可。')
  }
  const strong = dayMasterStrength(f)
  out.push(strong === '旺'
    ? '日主偏旺，体质强健但易急躁上火，宜静心养性、疏泄有度。'
    : strong === '弱'
      ? '日主偏弱，易疲劳乏力，需注意增强体质、规律作息。'
      : '日主中和，阴阳平衡，体质稳定，保持良好习惯即可。')
  return out
}

/* 事业 (付费) */
export function jiepanCareer(f) {
  const dw = dayWx(f)
  const out = []
  const careerMap = {
    木: '教育、文化、出版、林业、医药、服装',
    火: '互联网、能源、传媒、餐饮、美容、演艺',
    土: '房地产、建筑、农业、仓储、顾问咨询',
    金: '金融、机械、五金、汽车、军警、法律',
    水: '贸易、物流、旅游、水产、金融流通、智慧行业',
  }
  out.push(`日主${dw}性，${WX_ATTR[dw]}。适合行业方向：${careerMap[dw]}。`)
  const guan = f.pillars.flatMap((p) => p.canggan.map((c) => c.shishen)).concat(f.pillars.map((p) => p.ganShishen)).filter((s) => s === '正官' || s === '七杀').length
  out.push(guan >= 2
    ? '官杀有力，事业心强，适合体制内、管理层或自主创业掌舵，中年后易掌实权。'
    : guan === 1
      ? '官星清透，职场发展稳健，宜踏实积累、把握晋升机会，做决策者比执行者更合适。'
      : '官杀偏弱，更适合专业技术路线或自由职业，凭一技之长立足，不宜勉强求官。')
  const strong = dayMasterStrength(f)
  out.push(strong === '旺'
    ? '日主旺而喜泄，适合挑大梁、带团队，越有挑战越能激发潜能；忌守成安逸。'
    : strong === '弱'
      ? '日主偏弱宜扶，适合在成熟平台借力发展，贵人上司是你的重要资源。'
      : '日主中和，事业弹性大，文武皆宜，关键在于专注深耕一个领域。')
  // 大运提示
  const dy = f.dayun.find((d) => d.ganShishen === '正官' || d.ganShishen === '七杀' || d.ganShishen === '正印' || d.ganShishen === '偏印')
  out.push(dy
    ? `当前大运周期建议关注「${f.dayun[0].name}」运（${f.dayun[0].startAge}起），此运${f.dayun[0].ganShishen}主事，利于事业推进与名声积累。`
    : '未来大运整体平顺，把握 35 岁前后的关键转折期，事业可再上层楼。')
  return out
}

/* 财富 (付费) */
export function jiepanWealth(f) {
  const cai = f.pillars.flatMap((p) => p.canggan.map((c) => c.shishen)).concat(f.pillars.map((p) => p.ganShishen)).filter((s) => s === '正财' || s === '偏财').length
  const out = []
  out.push(cai >= 3
    ? '财星满盘，天生财缘旺盛，偏财运佳，易有意外之财，但需防财来财去、守财不易。'
    : cai >= 2
      ? '财星得力，求财有道，正财稳定，中年后财库渐丰。'
      : cai === 1
        ? '财星清透，财运平实，宜稳扎稳打、以专业换财，不宜投机。'
        : '财星偏弱，财宜藏不宜露，适合稳健储蓄与长期投资，忌高风险操作。')
  // 食伤生财
  const shishang = f.pillars.flatMap((p) => p.canggan.map((c) => c.shishen)).concat(f.pillars.map((p) => p.ganShishen)).filter((s) => s === '食神' || s === '伤官').length
  out.push(shishang >= 2
    ? '食伤生财格局明显，靠才华、技能、创意赚钱最旺，适合自媒体、手艺、副业创收。'
    : '食伤平和，以勤恳务实之财为主，多劳多得。')
  const strong = dayMasterStrength(f)
  out.push(strong === '旺'
    ? '日主旺能任财，可大胆开拓财路、广开财源，财富上限高。'
    : strong === '弱'
      ? '日主偏弱不胜财，赚钱辛苦，宜先补身（提升能力）再求财，忌贪多嚼不烂。'
      : '日主中和，财运平稳上升，细水长流最宜。')
  return out
}

/* 婚姻 (付费) */
export function jiepanMarriage(f) {
  const dw = dayWx(f)
  const out = []
  const gong = f.pillars[2].z // 日支 = 婚姻宫
  out.push(`婚姻宫坐${ZHI[gong]}（${ZHI_WX[gong]}），${WX_ATTR[ZHI_WX[gong]]}。`)
  // 配偶星: 男看财星, 女看官星
  const star = f.gender === '女' ? '官' : '财'
  const stars = f.pillars.flatMap((p) => p.canggan.map((c) => c.shishen)).concat(f.pillars.map((p) => p.ganShishen)).filter((s) => s.includes(star === '官' ? '官' : '财'))
  if (f.gender === '女') {
    out.push(stars.length >= 2
      ? '官星（夫星）有力，婚姻缘分清晰，配偶能力强，婚后受尊重。'
      : stars.length === 1
        ? '官星明现，感情路顺，配偶缘佳，宜早定终身。'
        : '官星不显，感情含蓄，缘分多在 25 岁后，宜耐心等待良缘。')
  } else {
    out.push(stars.length >= 2
      ? '财星（妻星）有力，妻缘深厚，婚后得贤内助，家庭美满。'
      : stars.length === 1
        ? '妻星清透，婚姻和谐，细水长流。'
        : '财星暗藏，婚姻缘分较晚，婚后感情稳定。')
  }
  // 桃花
  const taohua = ['子', '午', '卯', '酉'].includes(ZHI[f.pillars[0].z]) || ['子', '午', '卯', '酉'].includes(ZHI[gong])
  out.push(taohua
    ? '命带桃花，异性缘佳，魅力出众，但需注意把握分寸，避免感情纠葛。'
    : '桃花平淡，感情专一，家庭观念重，婚姻稳定性高。')
  const strong = dayMasterStrength(f)
  out.push(strong === '旺'
    ? '日主旺者宜配柔和伴侣，互补中和为佳；脾气上宜多包容。'
    : strong === '弱'
      ? '日主偏弱，宜配能力强、有主见的伴侣，彼此成就。'
      : '日主中和，夫妻相得益彰，共度风雨，白头可期。')
  return out
}

/* 综合入口 */
export function generateJiepan(f) {
  return {
    liuqin: jiepanLiuqin(f),
    health: jiepanHealth(f),
    career: jiepanCareer(f),
    wealth: jiepanWealth(f),
    marriage: jiepanMarriage(f),
  }
}

/* 一句话总评 (免费展示) */
export function summaryJiepan(f) {
  const dw = dayWx(f)
  const strong = dayMasterStrength(f)
  const miss = missingWx(f)
  return `日主${dw}${strong}，五行${miss.length ? miss.join('、') + '偏弱' : '相对均衡'}。${WX_ATTR[dw]}。整体格局${strong === '旺' ? '气势开阔' : strong === '弱' ? '稳中求进' : '中正平和'}，宜顺势而为、扬长避短。`
}
