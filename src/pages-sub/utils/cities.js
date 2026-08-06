/**
 * 道元易学 · 中国省市区经纬度数据 (真太阳时定位)
 * 结构: 省 -> [ { name 市, lng, lat, districts: [区县...] } ]
 * 区县经纬度复用所属市 (区县级差异对真太阳时影响 < 2 分钟, 可接受)
 */
export const REGION_DATA = [
  { prov: '北京', cities: [{ name: '北京', lng: 116.41, lat: 39.9, districts: ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '昌平区', '通州区'] }] },
  { prov: '上海', cities: [{ name: '上海', lng: 121.47, lat: 31.23, districts: ['黄浦区', '徐汇区', '静安区', '浦东新区', '闵行区', '嘉定区', '松江区'] }] },
  { prov: '天津', cities: [{ name: '天津', lng: 117.19, lat: 39.13, districts: ['和平区', '河西区', '南开区', '滨海新区', '武清区', '宝坻区'] }] },
  { prov: '重庆', cities: [{ name: '重庆', lng: 106.55, lat: 29.56, districts: ['渝中区', '江北区', '沙坪坝区', '南岸区', '九龙坡区', '万州区', '涪陵区'] }] },
  { prov: '河北', cities: [
    { name: '石家庄', lng: 114.51, lat: 38.04, districts: ['长安区', '桥西区', '新华区', '正定县', '鹿泉区'] },
    { name: '唐山', lng: 118.18, lat: 39.63, districts: ['路北区', '路南区', '丰润区', '丰南区'] },
    { name: '保定', lng: 115.46, lat: 38.87, districts: ['竞秀区', '莲池区', '徐水区', '涿州市'] },
    { name: '邯郸', lng: 114.54, lat: 36.63, districts: ['丛台区', '邯山区', '复兴区'] },
  ] },
  { prov: '山西', cities: [
    { name: '太原', lng: 112.55, lat: 37.87, districts: ['小店区', '迎泽区', '杏花岭区', '万柏林区'] },
    { name: '大同', lng: 113.3, lat: 40.08, districts: ['平城区', '云冈区', '新荣区'] },
    { name: '运城', lng: 111.0, lat: 35.03, districts: ['盐湖区', '河津市', '永济市'] },
  ] },
  { prov: '内蒙古', cities: [
    { name: '呼和浩特', lng: 111.75, lat: 40.84, districts: ['新城区', '回民区', '赛罕区', '土默特左旗'] },
    { name: '包头', lng: 109.84, lat: 40.66, districts: ['昆都仑区', '青山区', '东河区'] },
    { name: '鄂尔多斯', lng: 109.78, lat: 39.61, districts: ['东胜区', '康巴什区', '达拉特旗'] },
  ] },
  { prov: '辽宁', cities: [
    { name: '沈阳', lng: 123.43, lat: 41.8, districts: ['和平区', '沈河区', '大东区', '浑南区'] },
    { name: '大连', lng: 121.61, lat: 38.91, districts: ['中山区', '西岗区', '沙河口区', '金州区'] },
    { name: '鞍山', lng: 122.99, lat: 41.11, districts: ['铁东区', '铁西区', '立山区'] },
    { name: '锦州', lng: 121.13, lat: 41.1, districts: ['古塔区', '凌河区', '太和区'] },
  ] },
  { prov: '吉林', cities: [
    { name: '长春', lng: 125.32, lat: 43.9, districts: ['南关区', '宽城区', '朝阳区', '二道区'] },
    { name: '吉林', lng: 126.55, lat: 43.84, districts: ['昌邑区', '龙潭区', '船营区'] },
    { name: '延吉', lng: 129.51, lat: 42.91, districts: ['延吉市', '珲春市', '敦化市'] },
  ] },
  { prov: '黑龙江', cities: [
    { name: '哈尔滨', lng: 126.53, lat: 45.8, districts: ['道里区', '南岗区', '道外区', '香坊区'] },
    { name: '齐齐哈尔', lng: 123.92, lat: 47.35, districts: ['龙沙区', '建华区', '铁锋区'] },
    { name: '大庆', lng: 125.03, lat: 46.59, districts: ['萨尔图区', '龙凤区', '让胡路区'] },
  ] },
  { prov: '江苏', cities: [
    { name: '南京', lng: 118.78, lat: 32.06, districts: ['玄武区', '秦淮区', '建邺区', '鼓楼区', '江宁区'] },
    { name: '苏州', lng: 120.62, lat: 31.3, districts: ['姑苏区', '虎丘区', '吴中区', '昆山市', '常熟市'] },
    { name: '无锡', lng: 120.3, lat: 31.57, districts: ['梁溪区', '锡山区', '惠山区', '江阴市'] },
    { name: '徐州', lng: 117.28, lat: 34.2, districts: ['云龙区', '鼓楼区', '泉山区', '铜山区'] },
  ] },
  { prov: '浙江', cities: [
    { name: '杭州', lng: 120.15, lat: 30.27, districts: ['上城区', '拱墅区', '西湖区', '滨江区', '余杭区'] },
    { name: '宁波', lng: 121.55, lat: 29.87, districts: ['海曙区', '江北区', '鄞州区', '慈溪市'] },
    { name: '温州', lng: 120.7, lat: 28.0, districts: ['鹿城区', '龙湾区', '瓯海区', '乐清市'] },
    { name: '绍兴', lng: 120.58, lat: 30.03, districts: ['越城区', '柯桥区', '上虞区', '诸暨市'] },
  ] },
  { prov: '安徽', cities: [
    { name: '合肥', lng: 117.23, lat: 31.82, districts: ['瑶海区', '庐阳区', '蜀山区', '包河区'] },
    { name: '芜湖', lng: 118.43, lat: 31.35, districts: ['镜湖区', '弋江区', '鸠江区'] },
    { name: '安庆', lng: 117.06, lat: 30.54, districts: ['迎江区', '大观区', '宜秀区'] },
    { name: '黄山', lng: 118.34, lat: 29.71, districts: ['屯溪区', '黄山区', '徽州区'] },
  ] },
  { prov: '福建', cities: [
    { name: '福州', lng: 119.3, lat: 26.08, districts: ['鼓楼区', '台江区', '仓山区', '晋安区'] },
    { name: '厦门', lng: 118.08, lat: 24.48, districts: ['思明区', '湖里区', '集美区', '同安区'] },
    { name: '泉州', lng: 118.68, lat: 24.87, districts: ['鲤城区', '丰泽区', '洛江区', '晋江市'] },
    { name: '漳州', lng: 117.65, lat: 24.51, districts: ['芗城区', '龙文区', '龙海区'] },
  ] },
  { prov: '江西', cities: [
    { name: '南昌', lng: 115.86, lat: 28.68, districts: ['东湖区', '西湖区', '青山湖区', '红谷滩区'] },
    { name: '九江', lng: 116.0, lat: 29.71, districts: ['浔阳区', '濂溪区', '柴桑区'] },
    { name: '赣州', lng: 114.93, lat: 25.83, districts: ['章贡区', '南康区', '赣县区'] },
  ] },
  { prov: '山东', cities: [
    { name: '济南', lng: 117.0, lat: 36.65, districts: ['历下区', '市中区', '槐荫区', '天桥区', '历城区'] },
    { name: '青岛', lng: 120.38, lat: 36.07, districts: ['市南区', '市北区', '崂山区', '黄岛区'] },
    { name: '烟台', lng: 121.45, lat: 37.46, districts: ['芝罘区', '莱山区', '福山区', '龙口市'] },
    { name: '潍坊', lng: 119.16, lat: 36.71, districts: ['潍城区', '寒亭区', '坊子区', '奎文区'] },
    { name: '临沂', lng: 118.36, lat: 35.1, districts: ['兰山区', '罗庄区', '河东区'] },
  ] },
  { prov: '河南', cities: [
    { name: '郑州', lng: 113.65, lat: 34.76, districts: ['中原区', '二七区', '管城区', '金水区'] },
    { name: '洛阳', lng: 112.45, lat: 34.62, districts: ['老城区', '西工区', '涧西区', '洛龙区'] },
    { name: '开封', lng: 114.31, lat: 34.8, districts: ['龙亭区', '顺河区', '鼓楼区', '禹王台区'] },
    { name: '南阳', lng: 112.53, lat: 32.99, districts: ['宛城区', '卧龙区', '邓州市'] },
  ] },
  { prov: '湖北', cities: [
    { name: '武汉', lng: 114.31, lat: 30.59, districts: ['江岸区', '江汉区', '硚口区', '汉阳区', '武昌区', '洪山区'] },
    { name: '宜昌', lng: 111.29, lat: 30.69, districts: ['西陵区', '伍家岗区', '点军区'] },
    { name: '襄阳', lng: 112.14, lat: 32.01, districts: ['襄城区', '樊城区', '襄州区'] },
    { name: '十堰', lng: 110.79, lat: 32.65, districts: ['茅箭区', '张湾区', '郧阳区'] },
  ] },
  { prov: '湖南', cities: [
    { name: '长沙', lng: 112.94, lat: 28.23, districts: ['芙蓉区', '天心区', '岳麓区', '开福区', '雨花区'] },
    { name: '株洲', lng: 113.13, lat: 27.83, districts: ['荷塘区', '芦淞区', '石峰区', '天元区'] },
    { name: '衡阳', lng: 112.57, lat: 26.89, districts: ['珠晖区', '雁峰区', '蒸湘区'] },
    { name: '岳阳', lng: 113.13, lat: 29.36, districts: ['岳阳楼区', '云溪区', '君山区'] },
  ] },
  { prov: '广东', cities: [
    { name: '广州', lng: 113.26, lat: 23.13, districts: ['越秀区', '海珠区', '荔湾区', '天河区', '白云区', '番禺区'] },
    { name: '深圳', lng: 114.06, lat: 22.55, districts: ['福田区', '罗湖区', '南山区', '宝安区', '龙岗区'] },
    { name: '珠海', lng: 113.57, lat: 22.27, districts: ['香洲区', '斗门区', '金湾区'] },
    { name: '佛山', lng: 113.12, lat: 23.02, districts: ['禅城区', '南海区', '顺德区', '三水区'] },
    { name: '东莞', lng: 113.75, lat: 23.02, districts: ['莞城区', '南城区', '东城区', '虎门镇'] },
    { name: '汕头', lng: 116.68, lat: 23.35, districts: ['金平区', '龙湖区', '濠江区'] },
    { name: '湛江', lng: 110.36, lat: 21.27, districts: ['赤坎区', '霞山区', '坡头区'] },
  ] },
  { prov: '广西', cities: [
    { name: '南宁', lng: 108.33, lat: 22.82, districts: ['兴宁区', '青秀区', '江南区', '西乡塘区'] },
    { name: '桂林', lng: 110.29, lat: 25.28, districts: ['秀峰区', '叠彩区', '象山区', '七星区'] },
    { name: '柳州', lng: 109.42, lat: 24.33, districts: ['城中区', '鱼峰区', '柳南区'] },
  ] },
  { prov: '海南', cities: [
    { name: '海口', lng: 110.35, lat: 20.05, districts: ['秀英区', '龙华区', '琼山区', '美兰区'] },
    { name: '三亚', lng: 109.51, lat: 18.25, districts: ['海棠区', '吉阳区', '天涯区', '崖州区'] },
  ] },
  { prov: '四川', cities: [
    { name: '成都', lng: 104.07, lat: 30.57, districts: ['锦江区', '青羊区', '金牛区', '武侯区', '成华区', '高新区'] },
    { name: '绵阳', lng: 104.68, lat: 31.47, districts: ['涪城区', '游仙区', '安州区'] },
    { name: '乐山', lng: 103.77, lat: 29.55, districts: ['市中区', '五通桥区', '沙湾区'] },
    { name: '宜宾', lng: 104.64, lat: 28.75, districts: ['翠屏区', '南溪区', '叙州区'] },
  ] },
  { prov: '贵州', cities: [
    { name: '贵阳', lng: 106.63, lat: 26.65, districts: ['南明区', '云岩区', '花溪区', '乌当区'] },
    { name: '遵义', lng: 106.93, lat: 27.73, districts: ['红花岗区', '汇川区', '播州区'] },
    { name: '六盘水', lng: 104.83, lat: 26.59, districts: ['钟山区', '六枝特区', '水城区'] },
  ] },
  { prov: '云南', cities: [
    { name: '昆明', lng: 102.71, lat: 25.04, districts: ['五华区', '盘龙区', '官渡区', '西山区', '呈贡区'] },
    { name: '大理', lng: 100.27, lat: 25.61, districts: ['大理市', '祥云县', '宾川县'] },
    { name: '丽江', lng: 100.23, lat: 26.86, districts: ['古城区', '玉龙县', '永胜县'] },
    { name: '西双版纳', lng: 100.8, lat: 22.01, districts: ['景洪市', '勐海县', '勐腊县'] },
  ] },
  { prov: '西藏', cities: [
    { name: '拉萨', lng: 91.11, lat: 29.65, districts: ['城关区', '堆龙德庆区', '达孜区'] },
    { name: '日喀则', lng: 88.88, lat: 29.27, districts: ['桑珠孜区', '南木林县', '江孜县'] },
  ] },
  { prov: '陕西', cities: [
    { name: '西安', lng: 108.93, lat: 34.27, districts: ['新城区', '碑林区', '莲湖区', '雁塔区', '未央区'] },
    { name: '宝鸡', lng: 107.14, lat: 34.36, districts: ['渭滨区', '金台区', '陈仓区'] },
    { name: '咸阳', lng: 108.71, lat: 34.33, districts: ['秦都区', '渭城区', '杨陵区'] },
    { name: '汉中', lng: 107.02, lat: 33.07, districts: ['汉台区', '南郑区', '城固县'] },
  ] },
  { prov: '甘肃', cities: [
    { name: '兰州', lng: 103.83, lat: 36.06, districts: ['城关区', '七里河区', '西固区', '安宁区'] },
    { name: '天水', lng: 105.72, lat: 34.58, districts: ['秦州区', '麦积区', '甘谷县'] },
    { name: '敦煌', lng: 94.66, lat: 40.14, districts: ['敦煌市', '肃州区'] },
  ] },
  { prov: '青海', cities: [
    { name: '西宁', lng: 101.78, lat: 36.62, districts: ['城东区', '城中区', '城西区', '城北区'] },
    { name: '格尔木', lng: 94.9, lat: 36.4, districts: ['格尔木市', '德令哈市'] },
  ] },
  { prov: '宁夏', cities: [
    { name: '银川', lng: 106.27, lat: 38.47, districts: ['兴庆区', '西夏区', '金凤区'] },
    { name: '吴忠', lng: 106.2, lat: 37.99, districts: ['利通区', '红寺堡区', '青铜峡市'] },
  ] },
  { prov: '新疆', cities: [
    { name: '乌鲁木齐', lng: 87.62, lat: 43.83, districts: ['天山区', '沙依巴克区', '新市区', '水磨沟区'] },
    { name: '喀什', lng: 75.99, lat: 39.47, districts: ['喀什市', '疏附县', '疏勒县'] },
    { name: '伊犁', lng: 81.32, lat: 43.92, districts: ['伊宁市', '奎屯市', '霍城县'] },
  ] },
  { prov: '香港', cities: [{ name: '香港', lng: 114.17, lat: 22.32, districts: ['香港岛', '九龙', '新界'] }] },
  { prov: '澳门', cities: [{ name: '澳门', lng: 113.54, lat: 22.2, districts: ['澳门半岛', '氹仔', '路环'] }] },
  { prov: '台湾', cities: [
    { name: '台北', lng: 121.5, lat: 25.03, districts: ['台北市', '新北市', '基隆市'] },
    { name: '高雄', lng: 120.3, lat: 22.62, districts: ['高雄市', '台南市', '屏东县'] },
  ] },
]

export const PROVINCE_NAMES = REGION_DATA.map((p) => p.prov)

/** 根据省/市/县索引取经纬度 (县级复用市级) */
export function getRegionLngLat(provIdx, cityIdx, districtIdx) {
  try {
    const prov = REGION_DATA[provIdx]
    if (!prov) return null
    const city = prov.cities[cityIdx] || prov.cities[0]
    if (!city) return null
    return { lng: city.lng, lat: city.lat, city: city.name, district: city.districts[districtIdx] || city.districts[0] || '' }
  } catch (e) {
    return null
  }
}
