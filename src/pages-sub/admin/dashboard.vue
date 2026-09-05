<template>
  <view class="admin-dash">
    <!-- ===== 左侧侧边栏 ===== -->
    <view class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <view class="logo-area">
        <view class="logo-seal" @tap="sidebarCollapsed = !sidebarCollapsed"><text>{{ sidebarCollapsed ? '☰' : '道' }}</text></view>
        <text class="logo-name" v-if="!sidebarCollapsed">道元易学</text>
        <!-- 版本号: 固定放在「道元易学·管理后台」之后 (2026-08-31: 原在顶栏模块名后, 切菜单时重复出现且多写了一个 v → vv1.11.x) -->
        <view class="logo-sub" v-if="!sidebarCollapsed">
          <text class="logo-sub-txt">管理后台</text>
          <text class="logo-ver" @tap.stop="showVersion">v{{ verNum }}</text>
        </view>
        <text v-else class="logo-ver" @tap.stop="showVersion">v{{ verNum }}</text>
      </view>

      <scroll-view scroll-y class="menu-scroll">
        <view
          v-for="m in visibleModules"
          :key="m.key"
          class="menu-item"
          :class="{ active: activeModule === m.key }"
          @tap="switchModule(m.key)"
        >
          <text class="menu-icon">{{ m.icon }}</text>
          <text class="menu-label" v-if="!sidebarCollapsed">{{ m.label }}</text>
        </view>
      </scroll-view>

      <view class="sidebar-foot">
        <view class="admin-user">
          <text class="au-avatar">{{ userStore.userInfo.nickname ? userStore.userInfo.nickname[0] : '管' }}</text>
          <view class="au-info" v-if="!sidebarCollapsed">
            <text class="au-name">{{ userStore.userInfo.nickname }}</text>
            <text class="au-role">{{ ROLE_LABEL[userRole] || '管理员' }}</text>
          </view>
        </view>
      </view>
      <view class="sidebar-collapse" @tap="sidebarCollapsed = !sidebarCollapsed">
        <text>{{ sidebarCollapsed ? '›' : '‹' }}</text>
      </view>
    </view>

    <!-- ===== 右侧主区 ===== -->
    <view class="main">
      <view class="topbar">
        <view class="tb-left">
          <text class="tb-title">{{ currentModule.label }}</text>
        </view>
        <view class="tb-actions">
          <text class="tb-link rotate-btn" @tap="rotateScreen">🔄 旋转屏幕</text>
          <text class="tb-link" @tap="goFront">返回前台 ›</text>
          <text class="tb-link danger" @tap="logout">退出登录</text>
        </view>
      </view>

      <scroll-view scroll-y class="content">
        <view class="content-inner">
        <!-- ===== 数据概览 ===== -->
        <view v-if="activeModule === 'overview'" class="overview">
          <view class="stat-grid">
            <view class="stat-card" v-for="s in statCards" :key="s.label">
              <text class="stat-num">{{ s.value }}</text>
              <text class="stat-label">{{ s.label }}</text>
            </view>
          </view>

          <view class="recent-panel">
            <view class="panel-head">
              <text class="panel-title">最近订单<text v-if="recentOrders.length" class="panel-count">（{{ recentOrders.length }} 笔）</text></text>
              <text class="panel-more" @tap="switchModule('orders')">查看全部 ›</text>
            </view>
            <view class="recent-list" v-if="recentOrders.length">
              <view class="recent-row" v-for="o in recentOrders" :key="o._id || o.order_no">
                <text class="rr-no ellipsis">{{ o.order_no }}</text>
                <text class="rr-items ellipsis">{{ (o.items || []).map((i) => i.name).join('、') }}</text>
                <text class="rr-price">¥{{ o.total_price }}</text>
                <text class="rr-status">{{ o.status }}</text>
                <text class="rr-time">{{ fmtOrderTime(o.created_at) }}</text>
              </view>
            </view>
            <view class="recent-empty" v-else>暂无订单</view>
          </view>
        </view>

        <!-- ===== 页面管理 ===== -->
        <view v-else-if="activeModule === 'home'" class="module">
          <view class="module-head">
            <text class="module-title">页面管理</text>
          </view>
          <view class="settings-card">
            <view class="settings-desc">
              <text class="sd-title">首页显示</text>
              <text class="sd-text">控制小程序首页功能入口的显示/隐藏</text>
            </view>
            <view class="f-row">
              <text class="f-label">精选推荐</text>
              <view class="f-input-wrap">
                <switch :checked="homeCfg.show_recommend" color="#c41e3a" style="transform: scale(0.85)" @change="homeCfg.show_recommend = $event.detail.value" />
              </view>
            </view>
            <view class="f-row">
              <text class="f-label">发布动态</text>
              <view class="f-input-wrap">
                <switch :checked="homeCfg.show_publish" color="#c41e3a" style="transform: scale(0.85)" @change="homeCfg.show_publish = $event.detail.value" />
              </view>
            </view>
            <view class="f-row">
              <text class="f-label">用户动态</text>
              <view class="f-input-wrap">
                <switch :checked="homeCfg.show_follow" color="#c41e3a" style="transform: scale(0.85)" @change="homeCfg.show_follow = $event.detail.value" />
              </view>
            </view>
            <view class="f-row">
              <text class="f-label">盘道入口</text>
              <view class="f-input-wrap">
                <switch :checked="homeCfg.show_pandao" color="#c41e3a" style="transform: scale(0.85)" @change="homeCfg.show_pandao = $event.detail.value" />
              </view>
            </view>
            <view class="f-row">
              <text class="f-label">直播入口</text>
              <view class="f-input-wrap">
                <switch :checked="homeCfg.show_live" color="#c41e3a" style="transform: scale(0.85)" @change="homeCfg.show_live = $event.detail.value" />
              </view>
            </view>
            <view class="settings-actions">
              <text class="settings-tip">关闭后小程序首页对应入口将隐藏</text>
              <view class="btn-p sm" v-if="canManageHome" @click="saveHomeConfig">保存配置</view>
            </view>
          </view>

          <view class="settings-card">
            <view class="settings-desc">
              <text class="sd-title">首页-推荐页展示</text>
              <text class="sd-text">控制「推荐」页签中展示的内容模块（默认全部显示）</text>
            </view>
            <view class="f-row">
              <text class="f-label">推荐页·直播</text>
              <view class="f-input-wrap">
                <switch :checked="homeCfg.rec_show_live" color="#c41e3a" style="transform: scale(0.85)" @change="homeCfg.rec_show_live = $event.detail.value" />
              </view>
            </view>
            <view class="f-row">
              <text class="f-label">推荐页·盘道</text>
              <view class="f-input-wrap">
                <switch :checked="homeCfg.rec_show_pandao" color="#c41e3a" style="transform: scale(0.85)" @change="homeCfg.rec_show_pandao = $event.detail.value" />
              </view>
            </view>
            <view class="f-row">
              <text class="f-label">推荐页·商品</text>
              <view class="f-input-wrap">
                <switch :checked="homeCfg.rec_show_product" color="#c41e3a" style="transform: scale(0.85)" @change="homeCfg.rec_show_product = $event.detail.value" />
              </view>
            </view>
            <view class="f-row">
              <text class="f-label">推荐页·课程</text>
              <view class="f-input-wrap">
                <switch :checked="homeCfg.rec_show_course" color="#c41e3a" style="transform: scale(0.85)" @change="homeCfg.rec_show_course = $event.detail.value" />
              </view>
            </view>
            <view class="f-row">
              <text class="f-label">推荐页·动态</text>
              <view class="f-input-wrap">
                <switch :checked="homeCfg.rec_show_moment" color="#c41e3a" style="transform: scale(0.85)" @change="homeCfg.rec_show_moment = $event.detail.value" />
              </view>
            </view>
            <view class="settings-actions">
              <text class="settings-tip">关闭后「推荐」页签将不展示对应内容模块</text>
              <view class="btn-p sm" v-if="canManageHome" @click="saveHomeConfig">保存配置</view>
            </view>
          </view>

          <!-- 我的页面管理 -->
          <view class="settings-card">
            <view class="settings-desc">
              <text class="sd-title">我的管理</text>
              <text class="sd-text">控制「我的」页面功能板块的显示/隐藏</text>
            </view>
            <view class="f-row">
              <text class="f-label">玄学工具</text>
              <view class="f-input-wrap">
                <switch :checked="homeCfg.show_tools" color="#c41e3a" style="transform: scale(0.85)" @change="homeCfg.show_tools = $event.detail.value" />
              </view>
            </view>
            <view class="settings-actions">
              <text class="settings-tip">关闭后仅微信小程序不展示玄学工具，H5/App 正常显示（默认关闭）</text>
              <view class="btn-p sm" v-if="canManageHome" @click="saveHomeConfig">保存配置</view>
            </view>
          </view>

          <!-- 登录设置 -->
          <view class="settings-card">
            <view class="settings-desc">
              <text class="sd-title">登录设置</text>
            </view>
            <view class="f-row">
              <text class="f-label">显示微信一键登录</text>
              <view class="f-input-wrap">
                <switch :checked="homeCfg.show_wechat_login" color="#c41e3a" style="transform: scale(0.85)" @change="homeCfg.show_wechat_login = $event.detail.value" />
              </view>
            </view>
            <view class="settings-actions">
              <text class="settings-tip">默认关闭，开启后与手机号快捷登录上下排列</text>
              <view class="btn-p sm" v-if="canManageHome" @click="saveHomeConfig">保存配置</view>
            </view>
          </view>
        </view>

        <!-- ===== 盘道管理 ===== -->
        <view v-else-if="activeModule === 'pandao'" class="module">
          <view class="module-head">
            <text class="module-title">盘道管理</text>
          </view>
          <view class="settings-card">
            <view class="settings-desc">
              <text class="sd-title">盘道活动场次</text>
              <text class="sd-text">线下排盘道活动（默认每周三/周六通州总部，可增删）</text>
            </view>
            <view class="home-pandao-list">
              <view class="home-pd-row" v-for="pd in homePandaoList" :key="pd.id">
                <image class="home-pd-cover" v-if="pd.cover" :src="pd._coverUrl || pd.cover" mode="aspectFill"></image>
                <view class="home-pd-info">
                  <text class="home-pd-title">{{ pd.title }}
                    <text class="home-pd-status" :class="'st-' + pdStatusKey(pd.status)">{{ pd.status || '即将开始' }}</text>
                  </text>
                  <text class="home-pd-meta">{{ pd.day }} {{ pd.time }} · {{ pd.place }} · ¥{{ pd.price }}</text>
                </view>
                <view class="home-pd-ops" v-if="canManageHome">
                  <text class="op" @tap="movePandao(pd, -1)">↑</text>
                  <text class="op" @tap="movePandao(pd, 1)">↓</text>
                  <text class="op" @tap="editPandaoSession(pd)">编辑</text>
                  <text class="op danger" @tap="deletePandaoSession(pd)">删除</text>
                </view>
              </view>
              <view class="home-pd-row" v-if="!homePandaoList.length">
                <text class="home-pd-meta">暂无自定义场次（使用默认周三/周六）</text>
              </view>
            </view>
            <view class="pd-form-title">{{ pdForm.id ? '编辑场次 #' + pdForm.id : '新增场次' }}</view>
            <view class="f-row"><text class="f-label">标题</text><input class="f-input" v-model="pdForm.title" placeholder="如: 周六盘道 · 通州总部" /></view>
            <view class="f-row">
              <text class="f-label">活动日期</text>
              <picker mode="date" :value="pdForm.start_date" @change="onPdDatePick">
                <view class="f-input" :class="{ ph: !pdForm.start_date }">{{ pdForm.start_date || '点击选择日期' }}</view>
              </picker>
            </view>
            <view class="f-row">
              <text class="f-label">开始时间</text>
              <picker mode="time" :value="pdTimeValue" @change="onPdTimePick">
                <view class="f-input" :class="{ ph: !pdForm.time }">{{ pdForm.time || '点击选择时间' }}</view>
              </picker>
            </view>
            <view class="f-row">
              <text class="f-label">星期</text>
              <view class="f-input-wrap"><text class="f-label-plain">{{ pdForm.day || '选择日期后自动同步' }}</text></view>
            </view>
            <view class="f-row"><text class="f-label">地点</text><input class="f-input" v-model="pdForm.place" placeholder="活动地点" /></view>
            <view class="f-row"><text class="f-label">价格</text><input class="f-input" v-model="pdForm.price" placeholder="如: 129" /></view>
            <view class="f-row">
              <text class="f-label">封面图</text>
              <view class="f-input-wrap">
                <view class="f-row-inline" v-if="canManageHome">
                  <view class="btn-p plain sm" @click="uploadPandaoCover">上传封面</view>
                  <text class="f-label-sm">可多张（最多 {{ MAX_PD_COVERS }} 张，详情页左右滑动）</text>
                </view>
                <!-- 多封面缩略图: 点击看大图, × 移除单张 -->
                <view class="pd-cover-grid" v-if="(pdForm.covers || []).length">
                  <view class="pd-cover-cell" v-for="(c, i) in pdForm.covers" :key="i">
                    <image
                      class="pd-cover-thumb"
                      v-if="pdForm._coverUrls && pdForm._coverUrls[i]"
                      :src="pdForm._coverUrls[i]"
                      mode="aspectFill"
                      @tap="previewPandaoCover(i)"
                    ></image>
                    <view class="pd-cover-thumb ph" v-else><text>图</text></view>
                    <text class="pd-cover-idx">{{ i + 1 }}</text>
                    <text class="pd-cover-del" v-if="canManageHome" @tap.stop="removePandaoCover(i)">×</text>
                  </view>
                </view>
              </view>
            </view>
            <view class="f-row"><text class="f-label">状态</text>
              <view class="f-pills wrap">
                <text v-for="st in pdStatusOptions" :key="st" class="pill" :class="{ on: pdForm.status === st }" @tap="pdForm.status = st">{{ st }}</text>
              </view>
            </view>
            <view class="f-row"><text class="f-label">说明</text><input class="f-input" v-model="pdForm.desc" placeholder="活动简介" /></view>
            <view class="f-row"><text class="f-label">详情内容</text><textarea class="f-textarea pd-content-ta" v-model="pdForm.content" :maxlength="-1" placeholder="详情页活动介绍（可换行，不限字数）" /></view>
            <view class="settings-actions" v-if="canManageHome">
              <view class="btn-p plain sm" v-if="pdForm.id" @click="pdForm = emptyPdForm()">取消编辑</view>
              <view class="btn-p sm" @click="addPandaoSession">{{ pdForm.id ? '保存修改' : '添加场次' }}</view>
            </view>
          </view>

          <!-- 动态轮播图: 首页-盘道「关注公众号」板块上方自动循环播放 -->
          <view class="settings-card">
            <view class="settings-desc">
              <text class="sd-title">动态轮播图</text>
              <text class="sd-text">显示在首页-盘道「关注公众号」板块上方，自动左右循环播放</text>
            </view>
            <view class="f-row">
              <text class="f-label">轮播图</text>
              <view class="f-input-wrap">
                <view class="f-row-inline" v-if="canManageHome">
                  <view class="btn-p plain sm" @click="uploadPandaoBanner">上传图片</view>
                  <text class="f-label-sm">已选 {{ (pandaoBanners || []).length }} / {{ MAX_PD_BANNERS }} 张（上传后自动保存生效）</text>
                </view>
                <view class="pd-cover-grid" v-if="(pandaoBanners || []).length">
                  <view class="pd-cover-cell" v-for="(b, i) in pandaoBanners" :key="i">
                    <image
                      class="pd-cover-thumb"
                      v-if="pandaoBannerUrls && pandaoBannerUrls[i]"
                      :src="pandaoBannerUrls[i]"
                      mode="aspectFill"
                      @tap="previewPandaoBanner(i)"
                    ></image>
                    <view class="pd-cover-thumb ph" v-else><text>图</text></view>
                    <text class="pd-cover-idx">{{ i + 1 }}</text>
                    <text class="pd-cover-del" v-if="canManageHome" @tap.stop="removePandaoBanner(i)">×</text>
                  </view>
                </view>
                <text class="f-label-sm" v-if="!(pandaoBanners || []).length">暂无轮播图，前台不显示该板块</text>
              </view>
            </view>
          </view>

          <!-- 固定活动设置: 星期 + 时间 + 老师, 前台本月/下月统一生效 -->
          <view class="settings-card">
            <view class="settings-desc">
              <text class="sd-title">固定活动设置</text>
            </view>
            <view class="home-pandao-list">
              <view class="home-pd-row" v-for="(fp, i) in homePandaoFixed" :key="i">
                <view class="home-pd-info">
                  <text class="home-pd-title">{{ fp.weekday !== undefined ? '星期' + ['日','一','二','三','四','五','六'][fp.weekday] + ' ' : '' }}{{ fp.name }}<text v-if="fp.enabled === false" class="home-pd-status st-end">（已取消）</text></text>
                </view>
                <view class="home-pd-ops" v-if="canManageHome">
                  <text class="op" @tap="editFixedPandao(i)">编辑</text>
                  <text class="op" @tap="toggleFixedPandao(i)">{{ fp.enabled === false ? '恢复固定' : '取消固定' }}</text>
                  <text class="op danger" @tap="removeFixedPandao(i)">删除</text>
                </view>
              </view>
              <view class="home-pd-row" v-if="!homePandaoFixed.length">
                <text class="home-pd-meta">未设置固定活动</text>
              </view>
            </view>
            <view class="pd-form-title">{{ fpForm._idx >= 0 ? '编辑固定活动' : '新增固定活动' }}</view>
            <view class="f-row">
              <text class="f-label">星期</text>
              <picker mode="selector" :range="fixedPandaoWeekLabels" @change="(e) => (fpForm.weekday = Number(e.detail.value))">
                <view class="f-input">{{ fixedPandaoWeekLabels[fpForm.weekday] }}</view>
              </picker>
            </view>
            <view class="f-row"><text class="f-label">名称</text><input class="f-input" v-model="fpForm.name" placeholder="如: 线下盘道 · 通州总部" /></view>
            <view class="f-row"><text class="f-label">时间</text><input class="f-input" v-model="fpForm.time" placeholder="如: 14:00-17:00（可不填）" /></view>
            <view class="f-row"><text class="f-label">老师</text><input class="f-input" v-model="fpForm.teacher" placeholder="如: 昊辰老师" /></view>
            <view class="f-row"><text class="f-label">类型</text>
              <view class="f-pills">
                <text class="pill" :class="{ on: fpForm.type === 'online' }" @tap="fpForm.type = 'online'">线上</text>
                <text class="pill" :class="{ on: fpForm.type === 'offline' }" @tap="fpForm.type = 'offline'">线下</text>
              </view>
            </view>
            <view class="settings-actions" v-if="canManageHome">
              <view class="btn-p plain sm" v-if="fpForm._idx >= 0" @click="cancelEditFixedPandao">取消编辑</view>
              <view class="btn-p sm" @click="addFixedPandao">{{ fpForm._idx >= 0 ? '保存修改' : '添加固定活动' }}</view>
            </view>
          </view>
        </view>

        <!-- ===== 商品管理 ===== -->
        <view v-else-if="activeModule === 'products'" class="module cate-module">
          <!-- 左侧分类栏 -->
          <view class="cate-panel" :class="{ collapsed: cateCollapsed }">
            <view class="cate-panel-head">
              <text class="cate-panel-title" v-if="!cateCollapsed">商品分类</text>
              <text class="cate-add" v-if="!cateCollapsed && canWrite" @tap="openCateForm('products')">＋ 新建</text>
              <text class="cate-toggle" @tap="cateCollapsed = !cateCollapsed">{{ cateCollapsed ? '›' : '‹' }}</text>
            </view>
            <scroll-view scroll-y class="cate-panel-list">
              <view
                v-for="c in productCates"
                :key="c.id"
                class="cate-row"
                :class="{ active: productActiveCate === c.id }"
                @tap="switchProductCate(c.id)"
              >
                <text class="cate-row-name ellipsis">{{ c.name }}</text>
                <text class="cate-row-badge" :class="c.is_show === false ? 'off' : ''">{{ c.is_show === false ? '隐藏' : '显示' }}</text>
                <view class="cate-row-ops" @tap.stop v-if="canWrite">
                  <text class="cate-op" @tap="moveCate(c, -1, 'products')">↑</text>
                  <text class="cate-op" @tap="moveCate(c, 1, 'products')">↓</text>
                  <text class="cate-op" @tap="openCateForm('products', c)">编</text>
                  <text class="cate-op" @tap="toggleCateShow(c, 'products')">{{ c.is_show === false ? '显' : '隐' }}</text>
                  <text class="cate-op danger" @tap="deleteCate(c, 'products')">删</text>
                </view>
              </view>
            </scroll-view>
          </view>

          <!-- 右侧商品表 -->
          <view class="cate-main">
            <view class="module-head">
              <text class="module-title">{{ productActiveCateName }} · 商品（{{ productGrouped[productActiveCate] ? productGrouped[productActiveCate].length : 0 }}）</text>
              <view class="btn-p sm" v-if="canWrite" @click="openProductForm()">＋ 新增商品</view>
            </view>
            <view class="table">
              <view class="tr th">
                <text class="td w-img">图</text>
                <text class="td w-name">名称</text>
                <text class="td w-price">售价</text>
                <text class="td w-stock">库存</text>
                <text class="td w-status">状态</text>
                <text class="td w-rec" v-if="canWrite">首页推荐</text>
                <text class="td w-ops" v-if="canWrite">操作</text>
              </view>
              <view class="tr" v-for="p in productGrouped[productActiveCate] || []" :key="p.id">
                <image class="td w-img thumb" :src="p.images && p.images[0]" mode="aspectFill"></image>
                <text class="td w-name ellipsis">{{ p.name }}</text>
                <text class="td w-price">¥{{ p.price }}</text>
                <text class="td w-stock">{{ p.stock }}</text>
                <text class="td w-status" :class="p.is_show === false ? 'off' : 'on'">{{ p.is_show === false ? '已下架' : '已上架' }}</text>
                <view class="td w-rec ops" v-if="canWrite">
                  <text class="op" :class="p.home_recommend === true ? 'rec-on' : ''" @tap="toggleProductHome(p)">{{ p.home_recommend === true ? '★推荐' : '推荐' }}</text>
                </view>
                <view class="td w-ops ops" v-if="canWrite">
                  <text class="op" @tap="openProductForm(p)">编辑</text>
                  <text class="op" @tap="toggleProduct(p)">{{ p.is_show === false ? '上架' : '下架' }}</text>
                  <text class="op danger" @tap="deleteProduct(p)">删除</text>
                </view>
              </view>
              <view class="table-empty" v-if="!(productGrouped[productActiveCate] && productGrouped[productActiveCate].length)">
                该分类暂无商品
              </view>
            </view>
          </view>
        </view>

        <!-- ===== 课程管理 ===== -->
        <view v-else-if="activeModule === 'courses'" class="module cate-module">
          <!-- 左侧分类栏 -->
          <view class="cate-panel" :class="{ collapsed: cateCollapsed }">
            <view class="cate-panel-head">
              <text class="cate-panel-title" v-if="!cateCollapsed">课程分类</text>
              <text class="cate-add" v-if="!cateCollapsed && canManageCourses" @tap="openCateForm('courses')">＋ 新建</text>
              <text class="cate-toggle" @tap="cateCollapsed = !cateCollapsed">{{ cateCollapsed ? '›' : '‹' }}</text>
            </view>
            <scroll-view scroll-y class="cate-panel-list">
              <view
                v-for="c in courseCates"
                :key="c.id"
                class="cate-row"
                :class="{ active: courseActiveCate === c.id }"
                @tap="switchCourseCate(c.id)"
              >
                <text class="cate-row-name ellipsis">{{ c.name }}</text>
                <text class="cate-row-badge" :class="c.is_show === false ? 'off' : ''">{{ c.is_show === false ? '隐藏' : '显示' }}</text>
                <view class="cate-row-ops" @tap.stop v-if="canManageCourses">
                  <text class="cate-op" @tap="moveCate(c, -1, 'courses')">↑</text>
                  <text class="cate-op" @tap="moveCate(c, 1, 'courses')">↓</text>
                  <text class="cate-op" @tap="openCateForm('courses', c)">编</text>
                  <text class="cate-op" @tap="toggleCateShow(c, 'courses')">{{ c.is_show === false ? '显' : '隐' }}</text>
                  <text class="cate-op danger" @tap="deleteCate(c, 'courses')">删</text>
                </view>
              </view>
            </scroll-view>
          </view>

          <!-- 右侧课程表 -->
          <view class="cate-main">
            <view class="module-head">
              <text class="module-title">{{ courseActiveCateName }} · 课程（{{ courseGrouped[courseActiveCate] ? courseGrouped[courseActiveCate].length : 0 }}）</text>
              <view class="btn-p sm" v-if="canManageCourses" @click="openCourseForm()">＋ 新增课程</view>
            </view>
            <view class="table">
              <view class="tr th">
                <text class="td w-name">课程</text>
                <text class="td w-price">价格</text>
                <text class="td w-stock">课时</text>
                <text class="td w-status">等级</text>
                <text class="td w-rec" v-if="canManageCourses">首页推荐</text>
                <text class="td w-ops" v-if="canManageCourses">操作</text>
              </view>
              <view class="tr" v-for="c in courseGrouped[courseActiveCate] || []" :key="c.id">
                <text class="td w-name ellipsis">{{ c.title }}</text>
                <text class="td w-price">¥{{ c.price }}</text>
                <text class="td w-stock">{{ c.lessons_count }}</text>
                <text class="td w-status" :class="c.status === false || c.status === 'off' ? 'off' : 'on'">{{ c.status === false || c.status === 'off' ? '已下架' : '已上架' }}</text>
                <view class="td w-rec ops" v-if="canManageCourses">
                  <text class="op" :class="c.home_recommend === true ? 'rec-on' : ''" @tap="toggleCourseHome(c)">{{ c.home_recommend === true ? '★推荐' : '推荐' }}</text>
                </view>
                <view class="td w-ops ops" v-if="canManageCourses">
                  <text class="op" @tap="toggleCourse(c)">{{ c.status === false || c.status === 'off' ? '上架' : '下架' }}</text>
                  <text class="op" @tap="openCourseForm(c)">编辑</text>
                </view>
              </view>
              <view class="table-empty" v-if="!(courseGrouped[courseActiveCate] && courseGrouped[courseActiveCate].length)">
                该分类暂无课程
              </view>
            </view>
          </view>
        </view>

        <!-- ===== 订单管理 ===== -->
        <view v-else-if="activeModule === 'orders'" class="module">
          <view class="module-head">
            <text class="module-title">订单管理（{{ orders.length }}）</text>
            <view class="btn-p plain sm" v-if="canWrite" style="margin-right: 16rpx;" @click="reconcileOrders">对账修复</view>
            <view class="filter-pills">
              <text
                v-for="s in orderTypeFilterOptions"
                :key="s.value"
                class="pill"
                :class="{ on: orderTypeFilter === s.value }"
                @tap="orderTypeFilter = s.value; loadOrders()"
              >{{ s.label }}</text>
            </view>
            <view class="filter-pills">
              <text
                v-for="s in orderStatuses"
                :key="s"
                class="pill"
                :class="{ on: orderFilter === s }"
                @tap="orderFilter = s; loadOrders()"
              >{{ s }}</text>
            </view>
          </view>
          <!-- 订单分类统计: 商品/课程/AI解盘/预约 -->
          <view class="order-type-stats">
            <view class="ots-item" v-for="t in orderTypeStats" :key="t.key">
              <text class="ots-label">{{ t.label }}</text>
              <text class="ots-val">{{ t.count }}单 / ¥{{ t.amount.toFixed(0) }}</text>
            </view>
          </view>
          <view class="table orders-table">
            <view class="tr th">
              <text class="td w-no">订单号</text>
              <text class="td w-user">用户名</text>
              <text class="td w-name">商品</text>
              <text class="td w-price sortable" @tap="toggleOrderSort('amount')">金额 {{ orderSortArrow('amount') }}</text>
              <text class="td w-time sortable" @tap="toggleOrderSort('created_at')">下单时间 {{ orderSortArrow('created_at') }}</text>
              <text class="td w-status">状态</text>
              <text class="td w-ops w-ops-4" v-if="canWrite">操作</text>
            </view>
            <view class="tr" v-for="o in sortedOrders" :key="o._id || o.order_no">
              <text class="td w-no">{{ o.order_no }}</text>
              <text class="td w-user ellipsis">{{ o.nickname || ('UID ' + o.uid) }}</text>
              <text class="td w-name ellipsis">{{ (o.items || []).map((i) => i.name).join('、') }}</text>
              <text class="td w-price">¥{{ o.total_price }}</text>
              <text class="td w-time">{{ fmtOrderTime(o.created_at) }}</text>
              <view class="td w-status">
                <text :class="'st-' + stCls(o.status)">{{ o.status }}</text>
                <text class="td-logis" v-if="o.logistics_company">[{{ o.logistics_company }} {{ o.tracking_no }}]</text>
                <!-- 来源端标记 (2026-09-05): unknown=老订单未记录 -->
                <text class="td-platform" :class="'pf-' + pfCls(o.platform)" v-if="o.platform && o.platform !== 'unknown'">{{ pfText(o.platform) }}</text>
              </view>
              <view class="td w-ops w-ops-4 ops" v-if="canWrite">
                <text class="op op-col" :class="{ hide: o.status !== '待付款' }" @tap="payForOrder(o)">代收款</text>
                <text class="op op-col" :class="{ hide: o.status !== '待发货' }" @tap="openShip(o)">发货</text>
                <text class="op op-col danger" :class="{ hide: !canRefund(o) || userRole === 'staff' }" @tap="refundOrder(o)">退款</text>
                <text class="op op-col danger" :class="{ hide: userRole !== 'admin' }" @tap="deleteOrder(o)">删除</text>
              </view>
            </view>
          </view>
        </view>

        <!-- ===== 订单分析 ===== -->
        <view v-else-if="activeModule === 'orderAnalysis'" class="module">
          <view class="module-head">
            <text class="module-title">订单分析</text>
            <view class="filter-pills">
              <text
                v-for="r in analysisRangeOptions"
                :key="r.value"
                class="pill"
                :class="{ on: analysisRange === r.value }"
                @tap="switchAnalysisRange(r.value)"
              >{{ r.label }}</text>
            </view>
          </view>

          <!-- 成交分布: 单数 + 金额 (PC左右并列, 移动端上下排列) -->
          <view class="analysis-pies">
          <!-- 环形图: 按类型·单数分布 -->
          <view class="analysis-section">
            <text class="analysis-sub-title">订单分布（按类型·单数）</text>
            <view class="pie-wrap">
              <view class="pie-svg-box">
                <view v-if="analysisPie.length" class="pie-ring" :style="ringStyle('count')">
                  <view class="pie-ring-hole">
                    <text class="pie-svg-num">{{ analysisTotalCount }}</text>
                    <text class="pie-svg-label">总订单</text>
                  </view>
                </view>
                <view v-else class="pie-empty"><text>暂无数据</text></view>
              </view>
              <view class="pie-legend">
                <view class="legend-row" v-for="(p, i) in analysisPie" :key="p.key">
                  <view class="legend-dot" :style="{ background: pieColors[i % pieColors.length] }"></view>
                  <text class="legend-label">{{ p.label }}</text>
                  <text class="legend-count">{{ p.count }} 单</text>
                  <text class="legend-amount">{{ pct(p.count, analysisTotalCount) }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 环形图: 按类型·金额分布 -->
          <view class="analysis-section">
            <text class="analysis-sub-title">订单分布（按类型·金额）</text>
            <view class="pie-wrap">
              <view class="pie-svg-box">
                <view v-if="analysisPie.length" class="pie-ring" :style="ringStyle('amount')">
                  <view class="pie-ring-hole">
                    <text class="pie-svg-num">{{ analysisTotalAmount.toFixed(0) }}</text>
                    <text class="pie-svg-label">总金额</text>
                  </view>
                </view>
                <view v-else class="pie-empty"><text>暂无数据</text></view>
              </view>
              <view class="pie-legend">
                <view class="legend-row" v-for="(p, i) in analysisPie" :key="p.key">
                  <view class="legend-dot" :style="{ background: pieColors[i % pieColors.length] }"></view>
                  <text class="legend-label">{{ p.label }}</text>
                  <text class="legend-count">¥{{ p.amount.toFixed(2) }}</text>
                  <text class="legend-amount">{{ pct(p.amount, analysisTotalAmount) }}</text>
                </view>
              </view>
            </view>
          </view>
          </view>

          <!-- 成交分布汇总 -->
          <view class="analysis-summary">
            <text class="as-sum-item">总单数 <text class="as-num">{{ analysisTotalCount }}</text> 单</text>
            <view class="as-sum-divider"></view>
            <text class="as-sum-item">总金额 <text class="as-num price">¥{{ analysisTotalAmount.toFixed(2) }}</text></text>
            <view class="as-sum-divider"></view>
            <text class="as-sum-item">笔均 <text class="as-num">¥{{ analysisTotalCount ? (analysisTotalAmount / analysisTotalCount).toFixed(2) : '0.00' }}</text></text>
          </view>

          <!-- 产品销售统计 (表头可点击切换排序) -->
          <view class="analysis-section">
            <text class="analysis-sub-title">产品销售统计（{{ analysisProducts.length }} 项）</text>
            <view class="table" v-if="analysisProducts.length">
              <view class="tr th">
                <text class="td w-rank">排名</text>
                <text class="td w-rk-name">产品</text>
                <text class="td w-rk-count sort-th" @tap="toggleProductSort('count')">销售数量 {{ sortArrow('count') }}</text>
                <text class="td w-rk-amount sort-th" @tap="toggleProductSort('amount')">销售额 {{ sortArrow('amount') }}</text>
              </view>
              <view class="tr" v-for="(p, i) in analysisProductsSorted" :key="p.name">
                <text class="td w-rank" :class="{ 'rank-top': i < 3 }">{{ i + 1 }}</text>
                <text class="td w-rk-name ellipsis">{{ p.name }}</text>
                <text class="td w-rk-count">{{ p.count }}</text>
                <text class="td w-rk-amount">¥{{ p.amount.toFixed(2) }}</text>
              </view>
            </view>
            <view v-else class="empty-tip">暂无销售数据</view>
          </view>

          <!-- 用户消费排名 -->
          <view class="analysis-section">
            <text class="analysis-sub-title">用户消费排名 TOP {{ analysisRanking.length }}</text>
            <view class="table" v-if="analysisRanking.length">
              <view class="tr th">
                <text class="td w-rank">排名</text>
                <text class="td w-rk-name">用户</text>
                <text class="td w-rk-count">订单数</text>
                <text class="td w-rk-amount">消费金额</text>
              </view>
              <view class="tr" v-for="(u, i) in analysisRanking" :key="u.uid">
                <text class="td w-rank" :class="{ 'rank-top': i < 3 }">{{ i + 1 }}</text>
                <text class="td w-rk-name ellipsis">{{ u.nickname || ('UID ' + u.uid) }}</text>
                <text class="td w-rk-count">{{ u.count }}</text>
                <text class="td w-rk-amount">¥{{ u.total.toFixed(2) }}</text>
              </view>
            </view>
            <view v-else class="empty-tip">暂无消费数据</view>
          </view>
        </view>

        <!-- ===== 售后管理 ===== -->
        <view v-else-if="activeModule === 'aftersales'" class="module">
          <view class="module-head">
            <text class="module-title">售后管理（{{ aftersales.length }}）</text>
            <view class="filter-pills">
              <text
                v-for="s in aftersaleStatusOptions"
                :key="s"
                class="pill"
                :class="{ on: aftersaleFilter === s }"
                @tap="aftersaleFilter = s; loadAftersales()"
              >{{ s }}</text>
            </view>
          </view>
          <view class="as-search-bar">
            <input class="as-search-input" type="text" placeholder="搜索用户名 / 订单号" v-model="aftersaleKeyword" confirm-type="search" />
            <text v-if="aftersaleKeyword" class="as-search-clear" @tap="aftersaleKeyword = ''">✕</text>
          </view>
          <view class="table">
            <view class="tr th">
              <text class="td w-no">用户/订单</text>
              <text class="td w-name">售后内容</text>
              <text class="td w-time">时间</text>
              <text class="td w-status">状态</text>
              <text class="td w-ops" v-if="canWrite">操作</text>
            </view>
            <view class="tr" :class="{ 'tr-sub': a._isSub }" v-for="a in aftersaleRows" :key="a.id">
              <view class="td w-no">
                <template v-if="!a._isSub">
                  <text class="ellipsis">{{ a.nickname || ('UID ' + a.uid) }}</text>
                  <text class="td-sub ellipsis">{{ a.order_no }}</text>
                  <text class="td-sub ellipsis">{{ a.item_names }}</text>
                  <text class="td-sub">¥{{ a.total_price }}</text>
                  <text class="td-sub as-group-badge" v-if="a._groupCount > 1">共 {{ a._groupCount }} 条反馈</text>
                </template>
                <template v-else>
                  <text class="as-sub-tag">↳ 后续反馈 #{{ a._subIdx + 1 }}</text>
                  <text class="td-sub ellipsis as-sub-orderno">{{ a.order_no }}</text>
                </template>
              </view>
              <view class="td w-name">
                <text class="ellipsis">{{ a.content }}</text>
                <view class="fb-imgs" v-if="a._imgs && a._imgs.length">
                  <image class="fb-thumb" v-for="(src, si) in a._imgs" :key="si" :src="src" mode="aspectFill" @tap="previewAsImg(a, si)"></image>
                </view>
                <text class="td-sub as-reply-echo" v-if="a.reply">已回复：{{ a.reply }}</text>
              </view>
              <text class="td w-time">{{ a.created_at }}</text>
              <text class="td w-status" :class="a.status === '待处理' ? 'st-wait' : (a.status === '处理中' ? 'st-doing' : 'st-done')">{{ a.status }}</text>
              <view class="td w-ops ops" v-if="canWrite">
                <text class="op" @tap="openAftersaleHandle(a)">处理</text>
                <text class="op danger" @tap="deleteAftersale(a)">删除</text>
              </view>
            </view>
          </view>
        </view>

        <!-- ===== 用户管理 ===== -->
        <view v-else-if="activeModule === 'users'" class="module">
          <view class="module-head">
            <text class="module-title">用户管理（{{ usersFiltered.length }}）</text>
            <view class="btn-p sm" v-if="userRole === 'admin'" @click="showCreateUser = true">＋ 新建员工/管理员</view>
          </view>
          <view class="user-stats">
            <view class="us-item us-online">
              <text class="us-num">{{ userStats.online }}</text>
              <text class="us-label">当前在线</text>
            </view>
            <view class="us-item">
              <text class="us-num">{{ userStats.admin }}</text>
              <text class="us-label">管理员</text>
            </view>
            <view class="us-item">
              <text class="us-num">{{ userStats.staff }}</text>
              <text class="us-label">员工</text>
            </view>
            <view class="us-item">
              <text class="us-num">{{ userStats.user }}</text>
              <text class="us-label">用户</text>
            </view>
            <view class="us-item">
              <text class="us-num">{{ userStats.total }}</text>
              <text class="us-label">全部</text>
            </view>
          </view>
          <view class="table">
            <view class="tr th users-row">
              <view class="td w-avatar-cell">头像</view>
              <view class="td w-name users-nick">昵称</view>
              <view class="td w-no">登录凭证</view>
              <view class="td w-price">道号</view>
              <view class="td w-time">注册时间</view>
              <view class="td w-time">最后在线</view>
              <view class="td w-price" @tap="vipFilterMenu">{{ vipFilter === '全部' ? 'VIP' : 'VIP' + vipFilter }} ▾</view>
              <view class="td w-status" @tap="roleFilterMenu">{{ ROLE_LABEL[roleFilter] || '角色' }} ▾</view>
              <view class="td w-ops" v-if="canManageUsers">操作</view>
              <view class="td w-remark">备注</view>
            </view>
            <view class="tr users-row" v-for="u in usersFiltered" :key="u._id || u.uid">
              <view class="td w-avatar-cell">
                <image v-if="u.avatar" class="user-td-avatar" :src="u.avatar" mode="aspectFill"></image>
                <view v-else class="user-td-avatar user-td-avatar-fallback"><text>{{ u.nickname ? u.nickname[0] : '?' }}</text></view>
              </view>
              <view class="td w-name users-nick">
                <view class="nick-line">
                  <view v-if="u._online" class="online-dot"></view>
                  <text class="ellipsis">{{ u.nickname }}</text>
                </view>
              </view>
              <view class="td w-no">
                <view v-if="u.phone" class="cred-tag cred-phone">{{ u.phone }}</view>
                <view v-else-if="u.email" class="cred-tag cred-mail">{{ u.email }}</view>
                <view v-else-if="u.openid" class="cred-tag cred-wx">微信一键登录</view>
                <view v-else class="cred-tag cred-none">无凭证</view>
              </view>
              <view class="td w-price">{{ u.dao_code || '-' }}</view>
              <view class="td w-time">{{ u.created_at || '—' }}</view>
              <view class="td w-time">{{ u.last_active_at || u.last_login_at || '—' }}</view>
              <view class="td w-price">VIP{{ u.vip_level }}</view>
              <view class="td w-status">{{ ROLE_LABEL[u.role] || '用户' }}</view>
              <view class="td w-ops ops" v-if="canManageUsers">
                <!-- 所有用户行: 编辑 (弹窗内含 删除用户 / 修改道号) -->
                <text class="op" @tap="openEditUser(u)">编辑</text>
              </view>
              <view class="td w-remark ellipsis" @tap="canManageUsers && openEditUser(u)">{{ u.remark || '—' }}</view>
            </view>
          </view>
        </view>

        <!-- ===== 直播管理 ===== -->
        <view v-else-if="activeModule === 'lives'" class="module">
          <view class="module-head">
            <text class="module-title">直播管理（{{ lives.length }}）</text>
            <view class="btn-p sm" v-if="canWrite" @click="openLiveForm()">＋ 新增直播</view>
          </view>
          <view class="table">
            <view class="tr th">
              <text class="td w-img">图</text>
              <text class="td w-name">标题</text>
              <text class="td w-name">主播</text>
              <text class="td w-time">开始时间</text>
              <text class="td w-status">状态</text>
              <text class="td w-ops" v-if="canWrite">操作</text>
            </view>
            <view class="tr" v-for="l in lives" :key="l.id">
              <image class="td w-img thumb" :src="l._coverUrl || l.cover" mode="aspectFill"></image>
              <text class="td w-name ellipsis">{{ l.title }}</text>
              <text class="td w-name">{{ l.anchor }}</text>
              <text class="td w-time">{{ l.start_time || '-' }}</text>
              <text class="td w-status" :class="'ls-' + l.status">{{ { live: '直播中', upcoming: '未开始', ended: '已结束' }[l.status] || l.status }}</text>
              <view class="td w-ops ops" v-if="canWrite">
                <text class="op" @tap="moveLive(l, -1)">↑</text>
                <text class="op" @tap="moveLive(l, 1)">↓</text>
                <text class="op" @tap="openLiveForm(l)">编辑</text>
              </view>
            </view>
          </view>
        </view>

        <!-- ===== 动态管理 ===== -->
        <view v-else-if="activeModule === 'moments'" class="module">
          <view class="module-head">
            <text class="module-title">动态管理（{{ moments.length }}）</text>
          </view>
          <!-- 发布权限开关: 标签+开关+保存 一行显示 -->
          <view class="moment-cfg-row">
            <text class="moment-cfg-label">允许发布动态</text>
            <switch :checked="momentCfg.allow_publish_moment" color="#c41e3a" style="transform: scale(0.85)" @change="momentCfg.allow_publish_moment = $event.detail.value" />
            <view class="btn-p sm moment-cfg-save" v-if="canWrite" @click="saveMomentConfig">保存</view>
          </view>
          <text class="settings-tip" style="margin-bottom: 20rpx;">关闭后，普通用户和员工无法发布动态，仅超管/管理员可发布</text>
          <view class="table">
            <view class="tr th">
              <text class="td w-name">作者</text>
              <text class="td w-name">内容</text>
              <text class="td w-time">时间</text>
              <text class="td w-status">精选</text>
              <text class="td w-ops" v-if="canWrite">操作</text>
            </view>
            <view class="tr" v-for="m in moments" :key="m._id || m.id">
              <text class="td w-name">{{ m.user_name }}</text>
              <text class="td w-name ellipsis">{{ m.content }}</text>
              <text class="td w-time">{{ m.created_at || '-' }}</text>
              <text class="td w-status" :class="m.is_recommended ? 'on' : 'off'">{{ m.is_recommended ? '已精选' : '未精选' }}</text>
              <view class="td w-ops ops" v-if="canWrite">
                <text class="op op-fixed" @tap="auditMoment(m)">{{ m.is_recommended ? '取消精选' : '精选' }}</text>
                <text class="op danger" @tap="deleteMoment(m)">删除</text>
              </view>
            </view>
          </view>
        </view>

        <!-- ===== 优惠券管理 ===== -->
        <view v-else-if="activeModule === 'coupons'" class="module">
          <view class="module-head">
            <text class="module-title">优惠券管理（{{ coupons.length }}）</text>
            <view class="btn-p sm" v-if="canWrite" @click="openCouponForm()">＋ 新增优惠券</view>
          </view>
          <view class="table">
            <view class="tr th">
              <text class="td w-name">名称</text>
              <text class="td w-price">优惠</text>
              <text class="td w-stock">有效期</text>
              <text class="td w-status">状态</text>
              <text class="td w-ops" v-if="canWrite">操作</text>
            </view>
            <view class="tr" v-for="c in coupons" :key="c.id">
              <text class="td w-name">{{ c.name }}</text>
              <text class="td w-price" style="color:#c41e3a; white-space:nowrap">{{ c.discount }}</text>
              <text class="td w-stock" style="white-space:nowrap">{{ c.expire_at }}</text>
              <text class="td w-status">{{ c.status === 'valid' ? '有效' : '失效' }}</text>
              <view class="td w-ops ops" v-if="canWrite">
                <text class="op" @tap="openCouponForm(c)">编辑</text>
                <text class="op danger" @tap="deleteCoupon(c)">删除</text>
              </view>
            </view>
          </view>
        </view>

        <!-- ===== 反馈管理 ===== -->
        <view v-else-if="activeModule === 'feedbacks'" class="module">
          <view class="module-head">
            <text class="module-title">反馈管理（{{ feedbacks.length }}）</text>
          </view>
          <view class="table">
            <view class="tr th">
              <text class="td w-no">用户</text>
              <text class="td w-name">反馈内容</text>
              <text class="td w-time">时间</text>
              <text class="td w-status">状态</text>
              <text class="td w-ops" v-if="canWrite">操作</text>
            </view>
            <view class="tr" v-for="f in feedbacks" :key="f.id">
              <text class="td w-no ellipsis">{{ f.nickname || ('UID ' + f.uid) }} {{ f.dao_code ? '(' + f.dao_code + ')' : '' }}</text>
              <view class="td w-name">
                <text class="ellipsis">{{ f.content }}</text>
                <view class="fb-imgs" v-if="f._imgs && f._imgs.length">
                  <image class="fb-thumb" v-for="(src, si) in f._imgs" :key="si" :src="src" mode="aspectFill" @tap="previewFbImg(f, si)"></image>
                </view>
              </view>
              <text class="td w-time">{{ f.created_at }}</text>
              <text class="td w-status" :class="f.status === '待处理' ? 'st-wait' : 'st-done'">{{ f.status }}</text>
              <view class="td w-ops ops" v-if="canWrite">
                <text class="op" @tap="openFeedbackReply(f)">回复</text>
                <text class="op danger" @tap="deleteFeedback(f)">删除</text>
              </view>
            </view>
          </view>
        </view>

        <!-- ===== 系统设置 ===== -->
        <view v-else-if="activeModule === 'settings'" class="module">
          <view class="settings-tabs">
            <view
              v-for="t in settingsTabs"
              :key="t.group"
              class="settings-tab"
              :class="{ on: activeSettingsTab === t.group }"
              @tap="switchSettingsTab(t.group)"
            >
              <text>{{ t.label }}</text>
            </view>
          </view>

          <view class="settings-card" v-if="activeSettingsTab !== 'wxmp'">
            <view class="settings-desc">
              <text class="sd-title">{{ currentSettingsTab.label }}</text>
              <text class="sd-text">{{ currentSettingsTab.desc }}</text>
            </view>

            <view class="f-row set-row" v-for="f in currentSettingsTab.fields" :key="f.key">
              <text class="f-label">{{ f.label }}</text>
              <view class="f-input-wrap" :class="{ 'with-eye': !!f.secret, 'has-clear': !!f.secret && hasSecret(f.key) && !!settingsForm[f.key] }">
                <switch
                  v-if="f.type === 'switch'"
                  :checked="settingsForm[f.key] === '1' || settingsForm[f.key] === true"
                  color="#c41e3a"
                  style="transform: scale(0.85)"
                  @change="settingsForm[f.key] = $event.detail.value ? '1' : '0'"
                />
                <picker
                  v-else-if="f.type === 'select'"
                  :range="(f.options || []).map((o) => (typeof o === 'object' ? o.label : o))"
                  @change="onSelectSetting(f, $event)"
                >
                  <view class="f-input" :class="{ ph: !settingsForm[f.key] }">{{ settingSelectLabel(f) }}</view>
                </picker>
                <input
                  v-else
                  class="f-input"
                  :password="!!f.secret && !secretVisible(f)"
                  v-model="settingsForm[f.key]"
                  :placeholder="f.secret && settingsLoaded[activeSettingsTab] ? (f.secret && !settingsForm[f.key] && hasSecret(f.key) ? '•••••• 已配置（留空不修改）' : f.placeholder || '') : f.placeholder || ''"
                />
                <!-- 小眼睛: 点击切换明文/密文, 方便核对密钥是否填全 -->
                <text
                  v-if="f.secret"
                  class="f-eye"
                  :class="{ on: secretVisible(f) }"
                  @tap="toggleSecretVisible(f)"
                >{{ secretVisible(f) ? '🙈' : '👁' }}</text>
                <text
                  v-if="f.secret && hasSecret(f.key) && settingsForm[f.key]"
                  class="f-clear-secret"
                  @tap="clearSettingsSecret(f)"
                >清空</text>
              </view>
            </view>

            <!-- 月结账号管理 (仅物流分组; 数组结构, 不走上面的扁平字段循环) -->
            <view class="acct-block" v-if="activeSettingsTab === 'logistics'">
              <view class="acct-head">
                <text class="acct-title">月结账号</text>
                <text class="acct-add" v-if="canManageSettings" @tap="openAccountForm(null)">＋ 新增</text>
              </view>
              <text class="acct-desc">按快递公司分别配置月结账号与发件仓。发货时按所选快递自动匹配，无需手动切换。</text>

              <view v-if="!logisticsAccounts.length" class="acct-empty">
                <text>暂无账号，点「新增」添加第一个。未配置时用上方全局发件人信息下单。</text>
              </view>

              <view v-for="(a, i) in logisticsAccounts" :key="a.id || i" class="acct-item">
                <view class="acct-item-main">
                  <view class="acct-row1">
                    <text class="acct-name">{{ a.label || '未命名账号' }}</text>
                    <text class="acct-badge" :class="{ off: !isAccountOn(a) }">{{ isAccountOn(a) ? '启用' : '停用' }}</text>
                    <text class="acct-badge def" v-if="a.is_default">默认</text>
                  </view>
                  <text class="acct-meta">快递：{{ shipperName(a.shipper_code) }} · 月结号：{{ a.customer_name || '未填' }}</text>
                  <text class="acct-meta">发件仓：{{ accountWarehouse(a) }}</text>
                </view>
                <view class="acct-ops">
                  <text class="acct-op" @tap="toggleAccount(a)">{{ isAccountOn(a) ? '停用' : '启用' }}</text>
                  <text class="acct-op" @tap="setDefaultAccount(a)">默认</text>
                  <text class="acct-op" v-if="canManageSettings" @tap="openAccountForm(i)">编辑</text>
                  <text class="acct-op del" v-if="canManageSettings" @tap="removeAccount(i)">删除</text>
                </view>
              </view>
            </view>

            <view class="settings-actions">
              <text class="settings-tip">敏感字段保存后不显示明文，留空保存则保持原值</text>
              <view class="btn-p sm" v-if="activeSettingsTab === 'oss' && canManageSettings" @click="testOssConfig">{{ ossTesting ? '测试中...' : '测试连接' }}</view>
              <view class="btn-p sm" v-if="canManageSettings" @click="saveSettings">{{ settingsSaving ? '保存中...' : '保存配置' }}</view>
            </view>
            <view class="oss-test-result" v-if="activeSettingsTab === 'oss' && ossTestResult">
              <text :class="['oss-test-icon', ossTestResult.ok ? 'ok' : 'bad']">{{ ossTestResult.ok ? '✓' : '✗' }}</text>
              <text class="oss-test-msg">{{ ossTestResult.ok ? ossTestResult.message : ossTestResult.error }}</text>
            </view>
          </view>

          <!-- ===== C/OSS 存储管理 (始终显示, 关闭 C/OSS 时仅展示云开发COS 本地视频) ===== -->
          <view class="settings-card" v-if="activeSettingsTab === 'oss'">
            <view class="settings-desc">
              <text class="sd-title">视频存储管理（{{ ossVideoFiltered.length }}）</text>
              <text class="sd-text" v-if="ossEnabled">云开发COS = CloudBase 云存储（课程视频默认存储）；对象存储（{{ ossStorageLabel() }}）= 迁移目标。点击「搬运到 {{ ossStorageLabel() }}」将视频复制到对象存储。</text>
              <text class="sd-text" v-else>未启用 C/OSS 对象存储，下方仅展示云开发COS（CloudBase 云存储）中的课程视频，可查看与管理本地视频。开启对象存储后即可搬运到 {{ ossStorageLabel() }}。</text>
            </view>
            <view class="oss-toolbar">
              <view class="btn-p plain sm" @click="loadOssVideos">{{ ossLoading ? '加载中...' : '刷新列表' }}</view>
              <text class="oss-summary" v-if="ossVideoFiltered.length">
                <text class="oss-stat" v-if="ossStorageFilter !== 'remote'">云开发COS {{ ossFilteredLocalCount }} 个 · {{ fmtFileSize(ossFilteredLocalBytes) }}</text>
                <text class="oss-stat" v-if="ossEnabled && ossStorageFilter !== 'local'">{{ ossStorageLabel() }} {{ ossFilteredRemoteCount }} 个 · {{ fmtFileSize(ossFilteredRemoteBytes) }}</text>
              </text>
            </view>
            <view class="table oss-video-table" v-if="ossVideoFiltered.length">
              <view class="tr th">
                <view class="td oss-col-title oss-th-filter">
                  <text class="oss-th-label">课程 / 课时</text>
                  <view id="ossCourseSel" class="oss-caret-btn" :class="{ on: ossCourseFilter !== 'all' }" @tap.stop="toggleOssCourseFilter">
                    <text class="oss-caret-ico">▾</text>
                  </view>
                </view>
                <text class="td oss-col-size">大小</text>
                <view class="td oss-col-type oss-th-filter">
                  <text class="oss-th-label">存储</text>
                  <view id="ossStorageSel" class="oss-caret-btn" :class="{ on: ossStorageFilter !== 'all' }" @tap.stop="toggleOssStorageFilter">
                    <text class="oss-caret-ico">▾</text>
                  </view>
                </view>
                <text class="td oss-col-ops">操作</text>
              </view>
              <view class="oss-th-panel-mask" v-if="ossCourseOpen || ossStorageOpen" @tap="closeOssFilters"></view>
              <view v-if="ossCourseOpen" class="oss-th-panel" :style="coursePanelStyle">
                <text class="oss-opt" :class="{ on: ossCourseFilter === 'all' }" @tap="selectOssCourse('all')">全部课程</text>
                <text class="oss-opt" v-for="c in ossCourseOptions" :key="c.course_id" :class="{ on: ossCourseFilter === c.course_id }" @tap="selectOssCourse(c.course_id)">{{ c.course_title }}</text>
              </view>
              <view v-if="ossStorageOpen" class="oss-th-panel" :style="storagePanelStyle">
                <text class="oss-opt" :class="{ on: ossStorageFilter === 'all' }" @tap="selectOssStorage('all')">全部位置</text>
                <text class="oss-opt" :class="{ on: ossStorageFilter === 'local' }" @tap="selectOssStorage('local')">云开发COS</text>
                <text class="oss-opt" v-if="ossEnabled" :class="{ on: ossStorageFilter === 'remote' }" @tap="selectOssStorage('remote')">{{ storageTargetLabel }}</text>
              </view>
              <view class="tr" v-for="(v, vi) in ossVideoFiltered" :key="vi">
                <view class="td oss-col-title">
                  <text class="oss-course">{{ v.course_title }}</text>
                  <text class="oss-episode">{{ v.episode_title }}</text>
                </view>
                <text class="td oss-col-size">{{ fmtFileSize(v.size_bytes) }}</text>
                <text class="td oss-col-type" :class="v.inOss ? 'st-done' : 'st-wait'">{{ v.inOss ? ossStorageLabel() : '云开发COS' }}</text>
                <view class="td oss-col-ops ops">
                  <template v-if="canManageSettings">
                    <view v-if="v._migrating" class="migrate-progress">
                      <view class="mp-bar"><view class="mp-fill" :style="{ width: (v._migratePercent || 0) + '%' }"></view></view>
                      <text class="mp-pct">{{ v._migratePercent || 0 }}%</text>
                    </view>
                    <template v-else>
                      <text class="op" v-if="!v.inOss && ossEnabled" @tap="migrateOssVideo(v)">搬运到 {{ ossStorageLabel() }}</text>
                      <text class="op del" @tap="deleteOssVideo(v)">删除</text>
                    </template>
                  </template>
                  <text class="op done" v-else>已就绪</text>
                </view>
              </view>
            </view>
            <view class="empty-tip" v-else-if="!ossLoading">暂无可管理的视频（或当前筛选无结果）</view>
          </view>

          <!-- ===== 小程序接管 (仅"小程序接管"tab 显示) ===== -->
          <view class="settings-card" v-else-if="activeSettingsTab === 'wxmp'">
            <view class="settings-desc">
              <text class="sd-title">小程序接管（{{ wxmpList.length }}）</text>
              <text class="sd-text">已接管小程序（{{ wxmpList.length }}）：填 AppID → 生成授权链接 → 管理员扫码 → 自动接管（上传开发版 / 体验码 / 提审 / 发布）</text>
            </view>
            <view class="f-row">
              <text class="f-label">绑定小程序</text>
              <view class="f-input-wrap" v-if="canManageSettings"><view class="btn-p sm" @click="openWxmpBind"><text>＋ 绑定小程序</text></view></view>
            </view>
            <view class="table" v-if="wxmpList.length" style="margin-top: 16rpx">
              <view class="tr th">
                <text class="td w-no">小程序</text>
                <text class="td w-name">AppID</text>
                <text class="td w-time">绑定时间</text>
                <text class="td w-status">状态</text>
                <text class="td w-ops" v-if="canManageSettings">操作</text>
              </view>
              <view class="tr" v-for="m in wxmpList" :key="m.appid">
                <text class="td w-no ellipsis">{{ m.nickname || m.appid }}</text>
                <text class="td w-name ellipsis">{{ m.appid }}</text>
                <text class="td w-time">{{ m.bound_at }}</text>
                <text class="td w-status" :class="m.status === 'authorized' ? 'st-done' : 'st-wait'">{{ m.status === 'authorized' ? '已接管' : '已取消' }}</text>
                <view class="td w-ops ops" v-if="canManageSettings">
                  <text class="op" @tap="wxmpQr(m)">体验码</text>
                  <text class="op" @tap="wxmpUp(m)">上传开发版</text>
                  <text class="op" @tap="wxmpAudit(m)">提审</text>
                  <text class="op danger" @tap="wxmpPub(m)">发布</text>
                </view>
              </view>
            </view>
            <view class="table-empty" v-else style="margin-top: 16rpx">暂无接管的小程序，点上方「绑定小程序」开始</view>
          </view>
        </view>
        </view>
      </scroll-view>
    </view>

    <!-- ===== 小程序绑定弹窗 (填 AppID → 生成授权链接) ===== -->
    <view class="pp-mask" v-if="showWxmpBind" @tap="showWxmpBind = false"><view class="pp-sheet" @tap.stop>
      <view class="form-sheet">
        <view class="sheet-title">绑定小程序（管理员扫码接管）</view>
        <view class="f-row">
          <text class="f-label">小程序AppID</text>
          <input class="f-input" v-model="wxmpAppid" placeholder="wx 开头的 AppID" />
        </view>
        <view class="wxmp-bind-tip">生成授权链接后，用该小程序的<text class="wxmp-strong">管理员微信</text>扫码确认，即可自动接管</view>
        <view class="sheet-actions">
          <view class="btn-p plain sm" @click="showWxmpBind = false">取消</view>
          <view class="btn-p sm" @click="doWxmpBind">生成授权链接</view>
        </view>
        <view class="wxmp-auth" v-if="wxmpAuthUrl">
          <text class="wxmp-auth-tip">请用管理员微信打开以下链接完成授权：</text>
          <text class="wxmp-auth-url" @tap="copyWxmpAuthUrl">{{ wxmpAuthUrl }}</text>
          <view class="btn-fill btn-copy" @tap="copyWxmpAuthUrl"><text>复制授权链接</text></view>
        </view>
      </view>
    </view></view>

    <!-- ===== 体验码弹窗 ===== -->
    <view class="pp-mask center" v-if="showWxmpQr" @tap="showWxmpQr = false"><view class="pp-sheet" @tap.stop>
      <view class="form-sheet qr-sheet">
        <view class="sheet-title">小程序体验码</view>
        <image class="wxmp-qr-img" v-if="wxmpQrB64" :src="'data:image/png;base64,' + wxmpQrB64" mode="widthFix"></image>
        <view class="wxmp-qr-tip" v-else>获取体验码失败或暂无体验版</view>
        <view class="btn-p plain sm" @click="showWxmpQr = false">关闭</view>
      </view>
    </view></view>

    <!-- ===== 商品编辑弹窗 ===== -->
    <view class="pp-mask" v-if="showProduct" @tap="showProduct = false"><view class="pp-sheet" @tap.stop>
      <view class="form-sheet">
        <view class="sheet-title">{{ productForm.id ? '编辑商品' : '新增商品' }}</view>
        <view class="f-row"><text class="f-label">名称</text><input class="f-input" v-model="productForm.name" /></view>
        <view class="f-row"><text class="f-label">售价</text><input class="f-input" v-model="productForm.price" /></view>
        <view class="f-row"><text class="f-label">原价</text><input class="f-input" v-model="productForm.ot_price" /></view>
        <view class="f-row"><text class="f-label">库存</text><input class="f-input" type="number" v-model="productForm.stock" /></view>
        <view class="f-row"><text class="f-label">分类ID</text><input class="f-input" type="number" v-model="productForm.cate_id" /></view>
        <view class="f-row">
          <text class="f-label">图片</text>
          <view class="f-img-box">
            <textarea class="f-textarea" v-model="productForm.imagesText" :maxlength="-1" placeholder="多个图片用逗号分隔，或点下方上传"></textarea>
            <view class="f-img-row">
              <view class="f-img-item" v-for="(u, ui) in productImages" :key="ui">
                <image class="f-img-thumb" :src="u" mode="aspectFill"></image>
                <text class="f-img-del" @tap="removeProductImg(ui)">✕</text>
              </view>
              <view class="f-img-add" @tap="uploadProductImg">＋ 上传图片</view>
            </view>
          </view>
        </view>
        <view class="f-row"><text class="f-label">描述</text><textarea class="f-textarea" v-model="productForm.description" :maxlength="-1" /></view>
        <view class="attr-editor">
          <view class="attr-head">
            <text class="attr-title">商品属性</text>
            <text class="attr-add" @tap="addAttrRow">＋ 添加属性</text>
          </view>
          <view class="attr-row" v-for="(a, i) in productForm.attrsList" :key="i">
            <input class="attr-input" v-model="a.key" placeholder="属性名，如：材质" />
            <input class="attr-input" v-model="a.value" placeholder="属性值，如：天然朱砂" />
            <text class="attr-del" @tap="removeAttrRow(i)">✕</text>
          </view>
          <view class="attr-empty" v-if="!productForm.attrsList || !productForm.attrsList.length">
            暂无属性，点击「添加属性」为商品设置材质、规格等
          </view>
        </view>
        <view class="sheet-actions">
          <view class="btn-p plain sm" @click="showProduct = false">取消</view>
          <view class="btn-p sm" @click="saveProduct">保存</view>
        </view>
      </view>
    </view></view>

    <!-- ===== 课程编辑弹窗 ===== -->
    <view class="pp-mask course-mask" v-if="showCourse" @tap="showCourse = false"><view class="pp-sheet course-sheet" @tap.stop>
      <view class="form-sheet">
        <view class="sheet-title">
          {{ courseForm.id ? '编辑课程' : '新增课程' }}
          <text v-if="hasActiveUploads" class="abort-all-btn" @tap="abortAllUploads">⛔ 终止全部上传</text>
          <text class="clear-resume-btn" @tap="clearAllResume">清除断点记录</text>
        </view>
        <view class="f-row"><text class="f-label">标题</text><input class="f-input f-title" v-model="courseForm.title" placeholder="课程名称" /></view>
        <view class="f-row"><text class="f-label">讲师</text><input class="f-input" v-model="courseForm.teacher" /></view>
        <view class="f-row"><text class="f-label">价格</text><input class="f-input" v-model="courseForm.price" /></view>
        <view class="f-row"><text class="f-label">原价</text><input class="f-input" v-model="courseForm.ot_price" placeholder="选填，划线原价" /></view>
        <view class="f-row">
          <text class="f-label">封面</text>
          <view class="f-input-wrap">
            <input class="f-input" v-model="courseForm.cover" placeholder="封面图片地址" />
            <text class="btn-p sm" style="margin-left: 12rpx; flex-shrink: 0" @tap="uploadCourseCover">上传封面</text>
          </view>
        </view>
        <view class="f-row" v-if="courseForm.cover">
          <text class="f-label">预览</text>
          <image class="cover-preview" :src="courseForm.cover" mode="aspectFill"></image>
        </view>
        <!-- 兼容单视频字段 -->
        <view class="f-row" v-if="courseForm.video && !(courseForm.episodes && courseForm.episodes.length)">
          <text class="f-label">单视频</text>
          <view class="f-input-wrap">
            <input class="f-input" v-model="courseForm.video" placeholder="课程视频地址" />
            <text class="btn-p sm" style="margin-left: 12rpx; flex-shrink: 0" @tap="uploadCourseVideo">上传视频</text>
          </view>
        </view>
        <view class="f-row" v-if="courseForm.video">
          <text class="f-label">预览</text>
          <video
            class="video-preview"
            :src="courseForm.video"
            controls
            style="width: 320rpx; height: 180rpx; border-radius: 10rpx; background: #000"
          ></video>
        </view>
        <view class="f-row"><text class="f-label">分类ID</text><input class="f-input" type="number" v-model="courseForm.category_id" /></view>
        <view class="f-row"><text class="f-label">课时</text><input class="f-input" type="number" v-model="courseForm.lessons_count" /></view>
        <view class="f-row">
          <text class="f-label">等级</text>
          <view class="f-pills">
            <text v-for="lv in ['入门', '进阶', '高级']" :key="lv" class="pill" :class="{ on: courseForm.level === lv }" @tap="courseForm.level = lv">{{ lv }}</text>
          </view>
        </view>
        <view class="f-row" style="align-items: flex-start"><text class="f-label">描述</text><textarea class="f-textarea f-desc" v-model="courseForm.description" :maxlength="-1" placeholder="课程介绍（可多行）" /></view>
        <!-- 视频集 (多集: 每集标题+视频+文本) -->
        <view class="f-row" style="align-items: flex-start">
          <text class="f-label">课程大纲</text>
          <view class="ep-list" style="flex: 1">
            <view class="ep-tip">上传排队保存在当前页面：刷新/关闭页面后需重新选文件，系统会自动续传（不从头传）</view>
            <view class="ep-item" v-for="(ep, ei) in courseForm.episodes" :key="ep._key || ('ep' + ei)">
              <view class="ep-row">
                <text class="ep-index">{{ ei + 1 }}</text>
                <input class="f-input ep-title" v-model="ep.title" placeholder="课时名（如：第1课 阴阳五行）" />
                <text class="ep-op" @tap="moveEpisode(ei, -1)">↑</text>
                <text class="ep-op" @tap="moveEpisode(ei, 1)">↓</text>
                <text class="ep-op danger" @tap="removeEpisode(ei)">✕</text>
              </view>
              <view class="ep-row">
                <input class="f-input" v-model="ep.video" placeholder="本课时视频地址" />
                <!-- 上传中: 行内独立显示该课时进度 + 暂停/取消 (按钮绑定 ep 对象, 避免并行上传中索引错位) -->
                <view class="ep-up" v-if="ep._uploading">
                  <view class="ep-up-row">
                    <view class="ep-up-bar"><view class="ep-up-fill" :style="{ width: (ep._progress || 0) + '%' }"></view></view>
                    <text class="ep-up-pct">{{ ep._progress || 0 }}%</text>
                    <text class="ep-up-btn" @tap="togglePauseEpisodeUpload(ep)">{{ ep._paused ? '继续' : '暂停' }}</text>
                    <text class="ep-up-btn danger" @tap="cancelEpisodeUpload(ep)">取消</text>
                  </view>
                  <text class="ep-up-meta">网速 {{ ep._speed > 0 ? formatSpeed(ep._speed) : '计算中…' }} · 剩余 {{ ep._speed > 0 ? formatEta(ep._eta) : '计算中…' }}</text>
                  <text class="ep-up-status" v-if="ep._status">{{ ep._status }}</text>
                </view>
                <!-- 已暂停(让位给队列): 保留进度与续传点, 显示继续/取消, 队列继续下一个 (v1.11.308 修复: 之前让位后按钮消失只能重选文件) -->
                <view class="ep-up paused" v-else-if="ep._paused && !ep._uploading">
                  <view class="ep-up-row">
                    <view class="ep-up-bar"><view class="ep-up-fill" :style="{ width: (ep._progress || 0) + '%' }"></view></view>
                    <text class="ep-up-pct">{{ ep._progress || 0 }}%</text>
                    <text class="ep-up-btn" @tap="resumePausedUpload(ep)">继续</text>
                    <text class="ep-up-btn danger" @tap="cancelEpisodeUpload(ep)">取消</text>
                  </view>
                  <text class="ep-up-status">已暂停（点继续可续传，队列已继续下一个）</text>
                </view>
                <!-- 排队等待中: 显示等待上传 + 可取消排队 (2026-08-30 排队策略: 一次只传一个, 其他依次等待) -->
                <view class="ep-up queued" v-else-if="ep._queued">
                  <text class="ep-up-pct queued-txt">⏳ 等待上传</text>
                  <text class="ep-up-btn danger" @tap="removeFromQueue(ep)">取消排队</text>
                </view>
                <text class="btn-p sm" v-else style="margin-left: 10rpx; flex-shrink: 0" @tap="uploadEpisodeVideo(ep)">上传</text>
                <text
                  class="ep-free"
                  :class="{ on: ep.free !== false }"
                  @tap="ep.free = ep.free === false ? true : false"
                >{{ ep.free === false ? '付费' : '免费' }}</text>
              </view>
              <view class="ep-row">
                <textarea class="f-textarea ep-text" v-model="ep.text" :maxlength="-1" placeholder="课时文本说明（选填，显示在课程详情页该课时下方）"></textarea>
              </view>
            </view>
            <view class="btn-p plain sm" style="margin-top: 10rpx" @click="addEpisode">＋ 添加课时</view>
          </view>
        </view>
        <view class="sheet-actions">
          <view class="btn-p plain sm" @click="showCourse = false">取消</view>
          <view class="btn-p sm" @click="saveCourse">保存</view>
        </view>
      </view>
    </view></view>

    <!-- ===== 直播编辑弹窗 ===== -->
    <view class="pp-mask" v-if="showLive" @tap="showLive = false"><view class="pp-sheet" @tap.stop>
      <view class="form-sheet">
        <view class="sheet-title">{{ liveForm.id ? '编辑直播' : '新增直播' }}</view>
        <view class="f-row"><text class="f-label">标题</text><input class="f-input" v-model="liveForm.title" /></view>
        <view class="f-row">
          <text class="f-label">封面图</text>
          <view class="f-input-wrap">
            <view class="f-row-inline">
              <view class="btn-p plain sm" @click="uploadLiveCover">上传封面</view>
              <image class="cover-preview" v-if="liveForm.cover" :src="liveForm._coverUrl || liveForm.cover" mode="aspectFill" @tap="liveForm.cover && uni.previewImage({ urls: [liveForm._coverUrl || liveForm.cover] })"></image>
              <text class="f-label-sm" v-if="liveForm.cover" @tap="liveForm.cover = ''">移除</text>
            </view>
          </view>
        </view>
        <view class="f-row"><text class="f-label">主播</text><input class="f-input" v-model="liveForm.anchor" /></view>
        <view class="f-row"><text class="f-label">开始时间</text><input class="f-input" v-model="liveForm.start_time" placeholder="2026-08-05 20:00" /></view>
        <view class="f-row">
          <text class="f-label">状态</text>
          <view class="f-pills">
            <text v-for="st in ['upcoming', 'live', 'ended']" :key="st" class="pill" :class="{ on: liveForm.status === st }" @tap="liveForm.status = st">{{ { upcoming: '未开始', live: '直播中', ended: '已结束' }[st] }}</text>
          </view>
        </view>
        <view class="f-row"><text class="f-label">描述</text><textarea class="f-textarea" v-model="liveForm.description" :maxlength="-1" /></view>
        <view class="sheet-actions">
          <view class="btn-p plain sm" @click="showLive = false">取消</view>
          <view class="btn-p sm" @click="saveLive">保存</view>
        </view>
      </view>
    </view></view>

    <!-- ===== 优惠券编辑弹窗 ===== -->
    <view class="pp-mask" v-if="showCoupon" @tap="showCoupon = false"><view class="pp-sheet" @tap.stop>
      <view class="form-sheet">
        <view class="sheet-title">{{ couponForm.id ? '编辑优惠券' : '新增优惠券' }}</view>
        <view class="f-row"><text class="f-label">名称</text><input class="f-input" v-model="couponForm.name" /></view>
        <view class="f-row"><text class="f-label">优惠</text><input class="f-input" v-model="couponForm.discount" placeholder="如: 满 99 减 20" /></view>
        <view class="f-row"><text class="f-label">有效期</text><input class="f-input" v-model="couponForm.expire_at" placeholder="2026-12-31" /></view>
        <view class="sheet-actions">
          <view class="btn-p plain sm" @click="showCoupon = false">取消</view>
          <view class="btn-p sm" @click="saveCoupon">保存</view>
        </view>
      </view>
    </view></view>

    <!-- ===== 分配道号 / 编辑账号弹窗 (双模式) ===== -->
    <view class="pp-mask" v-if="showAssignId" @tap="showAssignId = false"><view class="pp-sheet" @tap.stop>
      <view class="form-sheet">
        <view class="sheet-title">{{ assignMode === 'edit' ? '编辑账号' : '分配道号' }}</view>
        <template v-if="assignMode === 'edit'">
          <view class="f-row"><text class="f-label">昵称</text><input class="f-input" v-model="assignForm.nickname" placeholder="用户昵称" /></view>
        </template>
        <view class="f-row"><text class="f-label">道号ID</text><input class="f-input" v-model="assignForm.dao_code" placeholder="如 ZHS00002 / ZHSM002" /></view>
        <view class="f-row">
          <text class="f-label">角色</text>
          <view class="f-pills wrap">
            <text
              v-for="r in editRoleOptions"
              :key="r.value"
              class="pill"
              :class="{ on: assignForm.role === r.value }"
              @tap="assignForm.role = r.value"
            >{{ r.label }}</text>
          </view>
        </view>
        <template v-if="assignMode === 'edit'">
          <view class="f-row"><text class="f-label">备注</text><input class="f-input" v-model="assignForm.remark" placeholder="备注描述（仅管理员可见）" /></view>
        </template>
        <view class="sheet-actions">
          <view class="btn-p plain sm" @click="showAssignId = false">取消</view>
          <view class="btn-p sm" @click="saveAssignId">{{ assignMode === 'edit' ? '保存修改' : '确认分配' }}</view>
        </view>
        <view v-if="assignMode === 'edit'" class="sheet-actions" style="margin-top: 16rpx">
          <view class="btn-p danger sm" @click="deleteUser(assignForm)">删除用户</view>
        </view>
      </view>
    </view></view>

    <!-- ===== 新建员工/管理员弹窗 (仅超级管理员) ===== -->
    <view class="pp-mask" v-if="showCreateUser" @tap="showCreateUser = false"><view class="pp-sheet" @tap.stop>
      <view class="form-sheet">
        <view class="sheet-title">新建员工 / 管理员</view>
        <view class="f-row"><text class="f-label">手机号</text><input class="f-input" type="number" maxlength="11" v-model="createForm.phone" placeholder="11位手机号" /></view>
        <view class="f-row"><text class="f-label">昵称</text><input class="f-input" v-model="createForm.nickname" placeholder="如：李明" /></view>
        <view class="f-row"><text class="f-label">初始密码</text><input class="f-input" v-model="createForm.password" placeholder="默认 123456" /></view>
        <view class="f-row">
          <text class="f-label">角色</text>
          <view class="f-pills wrap">
            <text
              v-for="r in createRoleOptions"
              :key="r.value"
              class="pill"
              :class="{ on: createForm.role === r.value }"
              @tap="createForm.role = r.value"
            >{{ r.label }}</text>
          </view>
        </view>
        <view class="sheet-actions">
          <view class="btn-p plain sm" @click="showCreateUser = false">取消</view>
          <view class="btn-p sm" @click="doCreateUser">创建账号</view>
        </view>
      </view>
    </view></view>

    <!-- ===== 反馈回复弹窗 ===== -->
    <view class="pp-mask" v-if="showFeedbackReply" @tap="showFeedbackReply = false"><view class="pp-sheet" @tap.stop>
      <view class="form-sheet">
        <view class="sheet-title">回复反馈</view>
        <view class="f-row"><text class="f-label">回复内容</text><textarea class="f-textarea" v-model="replyForm.reply" :maxlength="-1" placeholder="填写回复内容，反馈将标记为已处理" /></view>
        <view class="sheet-actions">
          <view class="btn-p plain sm" @click="showFeedbackReply = false">取消</view>
          <view class="btn-p sm" @click="saveFeedbackReply">确认回复</view>
        </view>
      </view>
    </view></view>

    <!-- ===== 售后处理弹窗 ===== -->
    <view class="pp-mask" v-if="showAftersaleHandle" @tap="showAftersaleHandle = false"><view class="pp-sheet" @tap.stop>
      <view class="form-sheet">
        <view class="sheet-title">处理售后</view>
        <template v-if="asHandleForm.rec">
          <view class="f-row"><text class="f-label">订单号</text><text class="f-text">{{ asHandleForm.rec.order_no }}</text></view>
          <view class="f-row"><text class="f-label">商品</text><text class="f-text">{{ asHandleForm.rec.item_names }}</text></view>
          <view class="f-row"><text class="f-label">用户</text><text class="f-text">{{ asHandleForm.rec.nickname || ('UID ' + asHandleForm.rec.uid) }}</text></view>
          <view class="f-row"><text class="f-label">问题描述</text><text class="f-text">{{ asHandleForm.rec.content }}</text></view>
          <view class="f-row" v-if="asHandleForm.rec._imgs && asHandleForm.rec._imgs.length">
            <text class="f-label">图片</text>
            <view class="fb-imgs">
              <image class="fb-thumb" v-for="(src, si) in asHandleForm.rec._imgs" :key="si" :src="src" mode="aspectFill" @tap="previewAsImg(asHandleForm.rec, si)"></image>
            </view>
          </view>
        </template>
        <view class="f-row">
          <text class="f-label">处理状态</text>
          <view class="f-pills">
            <text class="pill" :class="{ on: asHandleForm.status === '处理中' }" @tap="asHandleForm.status = '处理中'">处理中</text>
            <text class="pill" :class="{ on: asHandleForm.status === '已处理' }" @tap="asHandleForm.status = '已处理'">已处理</text>
          </view>
        </view>
        <view class="f-row"><text class="f-label">回复内容</text><textarea class="f-textarea" v-model="asHandleForm.reply" :maxlength="-1" placeholder="填写处理结果，将推送给用户" /></view>
        <view class="sheet-actions">
          <view class="btn-p plain sm" @click="showAftersaleHandle = false">取消</view>
          <view class="btn-p sm" @click="saveAftersaleReply">确认处理</view>
        </view>
      </view>
    </view></view>

    <!-- ===== 分类编辑弹窗 ===== -->
    <view class="pp-mask" v-if="showCate" @tap="showCate = false"><view class="pp-sheet" @tap.stop>
      <view class="form-sheet">
        <view class="sheet-title">{{ cateForm.id ? '编辑分类' : '新建分类' }}</view>
        <view class="f-row"><text class="f-label">分类名称</text><input class="f-input" v-model="cateForm.name" /></view>
        <view class="f-row"><text class="f-label">描述</text><textarea class="f-textarea" v-model="cateForm.description" :maxlength="-1" /></view>
        <view class="f-row">
          <text class="f-label">前端显示</text>
          <view class="f-pills">
            <text class="pill" :class="{ on: cateForm.is_show }" @tap="cateForm.is_show = true">显示</text>
            <text class="pill" :class="{ on: !cateForm.is_show }" @tap="cateForm.is_show = false">隐藏</text>
          </view>
        </view>
        <view class="sheet-actions">
          <view class="btn-p plain sm" @click="showCate = false">取消</view>
          <view class="btn-p sm" @click="saveCate">保存</view>
        </view>
      </view>
    </view></view>

    <!-- ===== 以下两个确认弹窗必须放在模板【最末尾】(2026-09-02) =====
         它们由上传流程触发, 而上传是在「课程编辑弹窗」内进行的; 若按 DOM 顺序排在课程弹窗之前,
         就会被课程弹窗盖住看不见。放到最后 + .topmost 更高层级, 保证浮在所有编辑弹窗之上 -->

    <!-- ===== 断点续传确认弹窗 (5s 未选择默认继续上传) ===== -->
    <view class="pp-mask center topmost" v-if="resumeConfirm">
      <view class="pp-sheet" @tap.stop>
        <view class="form-sheet rc-sheet">
          <view class="sheet-title">发现未完成的上传</view>
          <view class="rc-body">
            <text class="rc-main">上次该文件已上传约 <text class="rc-pct">{{ resumeConfirm.percent }}%</text>，是否从断点继续上传？</text>
            <text class="rc-tip">选「重新上传」将丢弃旧进度，从头开始</text>
          </view>
          <view class="sheet-actions">
            <view class="btn-p plain sm" @click="closeResumeConfirm(false)">重新上传</view>
            <view class="btn-p sm" @click="closeResumeConfirm(true)">继续上传（{{ resumeConfirm.left }}s）</view>
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 上传完成后 C/OSS 存储确认弹窗 (5s 未选择默认存储本地) ===== -->
    <view class="pp-mask center topmost" v-if="ossMigrateConfirm">
      <view class="pp-sheet" @tap.stop>
        <view class="form-sheet rc-sheet">
          <view class="sheet-title">C/OSS 存储</view>
          <view class="rc-body">
            <text class="rc-main">是否将该视频同时存储到 C/OSS（对象存储）？</text>
            <text class="rc-info" v-if="ossMigrateConfirm.label">课程：{{ ossMigrateConfirm.label }}</text>
            <text class="rc-info" v-if="ossMigrateConfirm.fname">文件：{{ ossMigrateConfirm.fname }}</text>
            <text class="rc-count">{{ ossMigrateConfirm.left }}s 后默认「存储本地」</text>
          </view>
          <view class="sheet-actions">
            <view class="btn-p plain sm" @click="closeOssMigrateConfirm(false)">存储本地</view>
            <view class="btn-p sm" @click="closeOssMigrateConfirm(true)">存储到 C/OSS</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 月结账号编辑弹窗 (多月结账号 + 多仓库) -->
    <view class="pp-mask center" v-if="showAccountForm" @tap="showAccountForm = false">
      <view class="pp-sheet" @tap.stop>
        <view class="form-sheet">
          <view class="sheet-head">
            <text class="sheet-title">{{ accountForm._idx === null ? '新增月结账号' : '编辑月结账号' }}</text>
            <text class="sheet-close" @tap="showAccountForm = false">✕</text>
          </view>

          <view class="f-row"><text class="f-label">备注名</text><input class="f-input" v-model="accountForm.label" placeholder="如：顺丰-北京仓" /></view>

          <view class="f-row"><text class="f-label">快递公司</text>
            <picker :range="ACCOUNT_SHIPPERS.map((s) => s.name)" :value="accountShipperIdx" @change="onAccountShipperChange">
              <view class="f-input" :class="{ ph: !accountForm.shipper_code }">{{ accountShipperName }}</view>
            </picker>
          </view>

          <view class="f-row"><text class="f-label">月结账号</text><input class="f-input" v-model="accountForm.customer_name" placeholder="快递公司月结客户号" /></view>
          <view class="f-row"><text class="f-label">月结密码</text><input class="f-input" :password="!acctPwdVisible" v-model="accountForm.customer_pwd" placeholder="选填，顺丰等需要" /></view>
          <view class="f-row"><text class="f-label">运费支付</text>
            <picker :range="PAY_TYPES.map((p) => p.label)" :value="accountPayIdx" @change="onAccountPayChange">
              <view class="f-input">{{ accountPayName }}</view>
            </picker>
          </view>

          <view class="acct-section">发件仓（留空则用上方全局发件人）</view>
          <view class="f-row"><text class="f-label">发件人</text><input class="f-input" v-model="accountForm.sender.name" placeholder="选填" /></view>
          <view class="f-row"><text class="f-label">电话</text><input class="f-input" v-model="accountForm.sender.tel" placeholder="选填" /></view>
          <view class="f-row"><text class="f-label">仓 省</text><input class="f-input" v-model="accountForm.sender.province" placeholder="选填，如 广东省" /></view>
          <view class="f-row"><text class="f-label">仓 市</text><input class="f-input" v-model="accountForm.sender.city" placeholder="选填，如 广州市" /></view>
          <view class="f-row"><text class="f-label">仓 区县</text><input class="f-input" v-model="accountForm.sender.area" placeholder="选填，如 天河区" /></view>
          <view class="f-row"><text class="f-label">详细地址</text><input class="f-input" v-model="accountForm.sender.address" placeholder="选填，街道门牌" /></view>

          <view class="btn-p" style="margin-top: 24rpx" @tap="saveAccount">保存账号</view>
          <text class="acct-hint">保存后还需点本分组的「保存配置」才会写入服务器</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
const ST_CLS = {'待付款':'unpaid','待发货':'unshipped','待收货':'unreceived','已完成':'done','已取消':'cancelled','已退款':'refunded','全部':'all'}
const stCls = (v) => ST_CLS[v] || v
/* 可退款判定: 仅已支付且未退款的订单(待发货/待收货)允许退款. 待付款/待支付(未付)与已取消/已退款/已完成 均不可退 —— 与"代收款"互斥 */
const canRefund = (o) => o.status === '待发货' || o.status === '待收货'

/* 订单来源端 (2026-09-05): platform 字段 → 展示文案与配色 */
const PF_TEXT = { 'mp-weixin': '小程序', 'h5': 'H5', 'web': 'H5', 'app': 'App' }
const PF_CLS = { 'mp-weixin': 'wx', 'h5': 'h5', 'web': 'h5', 'app': 'app' }
const pfText = (v) => PF_TEXT[String(v || '').toLowerCase()] || String(v || '')
const pfCls = (v) => PF_CLS[String(v || '').toLowerCase()] || 'other'

import { ref, computed, onMounted, reactive } from 'vue'
import { APP_VERSION, APP_COMMIT, APP_BUILD_DATE } from '@/version'
import {
  adminDashboard, adminList, adminProductCreate, adminProductUpdate, adminProductDelete,
  adminOrderAnalysis,
  adminCourseCreate, adminCourseUpdate, adminCourseEpisodeUpdate, adminOrderShip, adminOrderRefund, adminOrderDelete,
  adminOrderReconcile,
  adminUserCreate, adminUserUpdate, adminUserDelete, adminLiveCreate, adminLiveUpdate, adminMomentAudit, adminMomentDelete,
  adminCouponCreate, adminCouponUpdate, adminCouponDelete, adminRecentOrders,
  adminSettingsGet, adminSettingsSave, adminPandaoCreate, adminPandaoDelete, adminPandaoUpdate,
  adminVideosList, adminVideoMigrate, adminVideoMigrateProgress, adminVideoDelete, adminOssConfigTest,
  adminCateList, adminCateCreate, adminCateUpdate, adminCateDelete, adminLogisticsList,
  adminFeedbacksList, adminFeedbackReply, adminFeedbackDelete,
  adminAftersalesList, adminAftersaleReply, adminAftersaleDelete,
  wxmpGetAuthUrl, wxmpListBound, wxmpGetExperienceQr, wxmpUploadCode, wxmpSubmitAudit, wxmpRelease,
} from '../../api/api'
import { useUserStore } from '../../store/index'
import { getStorage } from '../../api/cloudbase'
import { resolveCloudList, resolveCloudUrl } from '../../utils/avatar'
import { clearCourseCache } from '../../utils/courseCache'

const userStore = useUserStore()
const verNum = computed(() => APP_VERSION.replace(/^v/, ''))

const modules = [
  { key: 'overview', label: '数据概览', icon: '📊' },
  { key: 'pandao', label: '盘道管理', icon: '☯️' },
  { key: 'lives', label: '直播管理', icon: '📡' },
  { key: 'products', label: '商品管理', icon: '🛍' },
  { key: 'courses', label: '课程管理', icon: '📚' },
  { key: 'orders', label: '订单管理', icon: '📦' },
  { key: 'orderAnalysis', label: '订单分析', icon: '📈' },
  { key: 'aftersales', label: '售后管理', icon: '🛠' },
  { key: 'coupons', label: '优惠券', icon: '🎟' },
  { key: 'moments', label: '动态管理', icon: '📝' },
  { key: 'feedbacks', label: '反馈管理', icon: '💬' },
  { key: 'users', label: '用户管理', icon: '👥' },
  { key: 'home', label: '页面管理', icon: '🏠' },
  { key: 'settings', label: '系统设置', icon: '⚙️' },
]
// 员工权限: 仅概览/盘道/直播/商品 (注意: 员工不能登录后台, 此配置保留以防历史会话)
const STAFF_MODULES = ['overview', 'pandao', 'lives', 'products']
const userRole = computed(() => userStore.userInfo.role || 'user')
/* 角色中文名 */
const ROLE_LABEL = { admin: '超级管理员', operator: '操作管理员', manager: '管理员', staff: '内部员工', user: '普通用户' }
/* 写操作权限: 超管(admin)/操作管理员(operator) 可写; 管理员(manager) 全站只读 */
const canWrite = computed(() => ['admin', 'operator'].includes(userRole.value))
/* 课程管理权限: 超管(admin)/操作管理员(operator) 可管理, 管理员(manager)/员工(staff) 只能查看 */
const canManageCourses = computed(() => ['admin', 'operator'].includes(userRole.value))
/* 用户管理: 仅超管(admin)可写 (2026-08-26 用户更正: 三块功能仅超管可设置) */
const canManageUsers = computed(() => ['admin', 'operator'].includes(userRole.value))
/* 系统设置: 仅超管可写 */
const canManageSettings = computed(() => userRole.value === 'admin')
/* 页面管理: 仅超管可写 */
const canManageHome = computed(() => userRole.value === 'admin')
const visibleModules = computed(() => {
  if (userRole.value === 'staff') {
    return modules.filter((m) => STAFF_MODULES.includes(m.key))
  }
  // admin(超管)/operator(操作管理员)/manager(管理员只读): 全部模块可见, 写权限由 canWrite/canManageUsers/canManageSettings 控制
  return modules
})
const activeModule = ref('overview')
const currentModule = computed(() => modules.find((m) => m.key === activeModule.value) || modules[0])

/* 概览 */
const stats = ref({})
const recentOrders = ref([])
const statCards = computed(() => [
  { label: '今日订单', value: stats.value.todayOrders ?? '-' },
  { label: '今日销售额', value: '¥' + (stats.value.todaySales ?? '-') },
  { label: '订单总数', value: stats.value.totalOrders ?? '-' },
  { label: '总销售额', value: '¥' + (stats.value.totalSales ?? '-') },
  { label: '用户总数', value: stats.value.totalUsers ?? '-' },
  { label: '商品总数', value: stats.value.totalProducts ?? '-' },
  { label: '课程总数', value: stats.value.totalCourses ?? '-' },
  { label: '课程销量', value: stats.value.courseSales ?? '-' },
])

/* 列表数据 */
const products = ref([])
const courses = ref([])
const orders = ref([])
const users = ref([])
const vipFilter = ref('全部')
const roleFilter = ref('全部')
/* 角色排序优先级: 超级管理员 > 操作管理员 > 管理员 > 员工 > 用户 */
const ROLE_ORDER = { admin: 0, operator: 1, manager: 2, staff: 3, user: 4 }
const usersFiltered = computed(() => {
  return users.value
    .filter((u) => {
      if (vipFilter.value !== '全部' && String(u.vip_level) !== vipFilter.value) return false
      if (roleFilter.value !== '全部' && (u.role || 'user') !== roleFilter.value) return false
      return true
    })
    .sort((a, b) => {
      const ra = ROLE_ORDER[a.role] ?? ROLE_ORDER.user
      const rb = ROLE_ORDER[b.role] ?? ROLE_ORDER.user
      if (ra !== rb) return ra - rb
      // 同角色内按道号排列 (数字部分优先, 保证 ZHS1 < ZHS10)
      const da = String(a.dao_code || '').replace(/\D/g, '')
      const db = String(b.dao_code || '').replace(/\D/g, '')
      const na = da ? Number(da) : 0
      const nb = db ? Number(db) : 0
      if (na !== nb) return na - nb
      return String(a.dao_code || '').localeCompare(String(b.dao_code || ''))
    })
})

/* 用户统计: 管理员(admin+manager+operator) / 员工(staff) / 用户(user) / 当前在线(5分钟内心跳) */
const userStats = computed(() => {
  let admin = 0, staff = 0, user = 0, online = 0
  users.value.forEach((u) => {
    const r = u.role || 'user'
    if (r === 'admin' || r === 'manager' || r === 'operator') admin++
    else if (r === 'staff') staff++
    else user++
    if (u._online) online++
  })
  return { admin, staff, user, total: users.value.length, online }
})

function vipFilterMenu() {
  uni.showActionSheet({
    itemList: ['全部', 'VIP0', 'VIP1', 'VIP2', 'VIP3'],
    success: (r) => {
      vipFilter.value = ['全部', '0', '1', '2', '3'][r.tapIndex]
    },
  })
}
function roleFilterMenu() {
  uni.showActionSheet({
    itemList: ['全部', '超级管理员', '操作管理员', '管理员', '员工', '用户'],
    success: (r) => {
      roleFilter.value = ['全部', 'admin', 'operator', 'manager', 'staff', 'user'][r.tapIndex]
    },
  })
}
const lives = ref([])
const moments = ref([])
const coupons = ref([])
const sidebarCollapsed = ref(true)
const cateCollapsed = ref(false)
const orderStatuses = ['全部', '待付款', '待发货', '待收货', '已完成', '已取消', '已退款']
const orderTypeFilterOptions = [
  { value: '全部', label: '全部类别' },
  { value: 'product', label: '商品' },
  { value: 'course', label: '课程' },
  { value: 'tool_unlock', label: 'AI解盘' },
  { value: 'appointment', label: '预约' },
]
const orderTypeFilter = ref('全部')
const orderFilter = ref('全部')

/* ---- 分类布局 (商品/课程) ---- */
const productCates = ref([])
const productActiveCate = ref(null)
const productGrouped = ref({})
const courseCates = ref([])
const courseActiveCate = ref(null)
const courseGrouped = ref({})

const productActiveCateName = computed(() => {
  const c = productCates.value.find((x) => x.id === productActiveCate.value)
  return c ? c.name : '全部商品'
})
const courseActiveCateName = computed(() => {
  const c = courseCates.value.find((x) => x.id === courseActiveCate.value)
  return c ? c.name : '全部课程'
})

function switchProductCate(id) {
  productActiveCate.value = id
}
function switchCourseCate(id) {
  courseActiveCate.value = id
}

async function loadProductCates() {
  const cats = await adminCateList({ type: 'products' })
  productCates.value = cats
  if (cats.length && !productCates.value.some((c) => c.id === productActiveCate.value)) {
    productActiveCate.value = cats[0].id
  }
  // 加载全部商品并按分类分组
  const list = await adminList({ collection: 'products' })
  const g = {}
  list.forEach((p) => {
    const key = p.cate_id || 0
    ;(g[key] = g[key] || []).push(p)
  })
  productGrouped.value = g
}

/* 后台课程管理默认隐藏的分类 (预置空分类, 上线课程后再显示) */
const HIDDEN_COURSE_CATES = ['八字命理', '奇门遁甲', '六爻预测', '风水堪舆']
async function loadCourseCates() {
  let cats = await adminCateList({ type: 'courses' })
  // 不再隐藏任何预置分类, 所有课程类别都可见
  courseCates.value = cats
  if (cats.length && !courseCates.value.some((c) => c.id === courseActiveCate.value)) {
    courseActiveCate.value = cats[0].id
  }
  const list = await adminList({ collection: 'courses' })
  const g = {}
  list.forEach((c) => {
    const key = c.category_id || 0
    ;(g[key] = g[key] || []).push(c)
  })
  courseGrouped.value = g
}

function switchModule(key) {
  activeModule.value = key
  loadModule(key)
}

async function loadModule(key) {
  try {
    if (key === 'overview') {
      const [s, r] = await Promise.all([adminDashboard(), adminRecentOrders({ limit: 10 })])
      stats.value = s
      recentOrders.value = r
    } else if (key === 'home') await loadHomeConfig()
    else if (key === 'products') await loadProductCates()
    else if (key === 'courses') await loadCourseCates()
    else if (key === 'orders') await loadOrders()
    else if (key === 'orderAnalysis') await loadOrderAnalysis()
    else if (key === 'users') {
      users.value = await adminList({ collection: 'users' })
      // cloud:// 头像转可访问 URL (H5 image 无法渲染 cloud://, 双端统一)
      try {
        users.value = await resolveCloudList(users.value, 'avatar', (u) => u.uid)
      } catch (e) { /* 转换失败保持 */ }
    }
    else if (key === 'lives') { lives.value = await adminList({ collection: 'live_streams' }); await resolveCloudListField(lives.value, 'cover') }
    else if (key === 'pandao') await loadPandaoConfig()
    else if (key === 'moments') { moments.value = await adminList({ collection: 'moments' }); await loadMomentConfig() }
    else if (key === 'coupons') coupons.value = await adminList({ collection: 'coupons' })
    else if (key === 'wxmp') await loadWxmp()
    else if (key === 'feedbacks') await loadFeedbacks()
    else if (key === 'aftersales') await loadAftersales()
    else if (key === 'settings') await loadSettings(activeSettingsTab.value)
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  }
}

/* ===== 页面管理 ===== */
const homeCfg = ref({ show_recommend: true, show_publish: false, show_pandao: true, show_live: false, show_follow: false, show_wechat_login: false, rec_show_live: true, rec_show_pandao: true, rec_show_product: true, rec_show_course: true, rec_show_moment: true, show_tools: false })
const momentCfg = ref({ allow_publish_moment: true }) // 动态发布权限开关 (默认允许)
const homePandaoList = ref([])
/* 固定盘道活动: 星期 + 时间 + 老师, 前台日历本月/下月统一生效 */
const homePandaoFixed = ref([])
/* 首页盘道「动态轮播图」: cloud:// fileID 数组, 存 settings(pandao 组) 的 banners 字段, 前台自动循环播放 */
const MAX_PD_BANNERS = 9
const pandaoBanners = ref([])
const pandaoBannerUrls = ref([])

const fixedPandaoWeekLabels = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const fpForm = ref({ _idx: -1, weekday: 3, name: '', time: '', teacher: '', type: 'offline' })
function editFixedPandao(i) {
  const fp = homePandaoFixed.value[i]
  if (!fp) return
  fpForm.value = { _idx: i, weekday: Number(fp.weekday) || 3, name: fp.name || '', time: fp.time || '', teacher: fp.teacher || '', type: fp.type || 'offline' }
}
function cancelEditFixedPandao() {
  fpForm.value = { _idx: -1, weekday: 3, name: '', time: '', teacher: '', type: 'offline' }
}
/* 新增或保存修改固定活动 (立即保存生效) */
async function addFixedPandao() {
  if (!fpForm.value.name.trim()) {
    uni.showToast({ title: '请输入活动名称', icon: 'none' })
    return
  }
  const data = {
    weekday: Number(fpForm.value.weekday),
    name: fpForm.value.name.trim(),
    time: fpForm.value.time.trim(),
    teacher: fpForm.value.teacher.trim() || '讲师',
    type: fpForm.value.type,
  }
  if (fpForm.value._idx >= 0) {
    homePandaoFixed.value[fpForm.value._idx] = { ...homePandaoFixed.value[fpForm.value._idx], ...data }
  } else {
    homePandaoFixed.value.push({ ...data, enabled: true })
  }
  cancelEditFixedPandao()
  try {
    await adminSettingsSave({ group: 'pandao', configs: { fixed: homePandaoFixed.value } })
    uni.showToast({ title: '已保存，前台本月/下月生效', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败，请重试', icon: 'none' })
  }
}
async function toggleFixedPandao(i) {
  const fp = homePandaoFixed.value[i]
  if (!fp) return
  fp.enabled = fp.enabled === false ? true : false
  uni.showToast({ title: fp.enabled ? '已恢复固定' : '已取消固定', icon: 'none' })
  // 取消/恢复固定立即保存, 前台日历与图例马上生效
  try {
    await adminSettingsSave({ group: 'pandao', configs: { fixed: homePandaoFixed.value } })
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败，请点保存配置', icon: 'none' })
  }
}
function removeFixedPandao(i) {
  homePandaoFixed.value.splice(i, 1)
}
async function saveFixedPandao() {
  try {
    await adminSettingsSave({ group: 'pandao', configs: { fixed: homePandaoFixed.value } })
    uni.showToast({ title: '已保存，前台本月/下月生效', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  }
}
const pdStatusOptions = ['即将开始', '进行中', '已结束']
function pdStatusKey(st) {
  return { '即将开始': 'upcoming', '进行中': 'live', '已结束': 'end' }[st] || 'upcoming'
}
/* 盘道场次: 日期 picker 选日期 → 自动算周几同步到 day */
function onPdDatePick(e) {
  const d = String(e.detail.value || '')
  pdForm.value.start_date = d
  if (d) {
    const wd = new Date(d.replace(/-/g, '/')).getDay()
    pdForm.value.day = '星期' + ['日', '一', '二', '三', '四', '五', '六'][wd]
  }
}
/* 盘道场次: 时间 picker */
function onPdTimePick(e) {
  pdForm.value.time = String(e.detail.value || '')
}
/* 时间 picker 回显值: 兼容旧区间格式 19:00-21:00 → 19:00 */
const pdTimeValue = computed(() => {
  const t = pdForm.value.time || ''
  return t.includes('-') ? t.split('-')[0].trim() : t
})

const MAX_PD_COVERS = 9 // 盘道封面最多张数 (详情页左右滑动轮播)
function emptyPdForm() {
  // covers: 多张封面 (cloud:// fileID 数组); cover 保留为首图以兼容列表页/订单
  return { id: 0, title: '', day: '', start_date: '', time: '', place: '', price: '', desc: '', content: '', status: '即将开始', cover: '', covers: [], _coverUrls: [] }
}
const pdForm = ref(emptyPdForm())

async function loadHomeConfig() {
  try {
    const [homeRes, recRes, mypageRes] = await Promise.all([
      adminSettingsGet({ group: 'home' }),
      adminSettingsGet({ group: 'recommend' }).catch(() => ({ configs: {} })),
      adminSettingsGet({ group: 'mypage' }).catch(() => ({ configs: {} })),
    ])
    const cfg = homeRes.configs || {}
    const rc = recRes.configs || {}
    const mp = mypageRes.configs || {}
    homeCfg.value = {
      show_recommend: cfg.show_recommend !== '0' && cfg.show_recommend !== false,
      show_publish: cfg.show_publish === '1' || cfg.show_publish === true,
      show_pandao: cfg.show_pandao !== '0' && cfg.show_pandao !== false,
      show_live: cfg.show_live === '1' || cfg.show_live === true,
      show_follow: cfg.show_follow === '1' || cfg.show_follow === true,
      show_wechat_login: cfg.show_wechat_login === '1' || cfg.show_wechat_login === true,
      rec_show_live: rc.rec_show_live !== '0' && rc.rec_show_live !== false,
      rec_show_pandao: rc.rec_show_pandao !== '0' && rc.rec_show_pandao !== false,
      rec_show_product: rc.rec_show_product !== '0' && rc.rec_show_product !== false,
      rec_show_course: rc.rec_show_course !== '0' && rc.rec_show_course !== false,
      rec_show_moment: rc.rec_show_moment !== '0' && rc.rec_show_moment !== false,
      show_tools: mp.show_tools === '1' || mp.show_tools === true,
    }
    const pd = await adminList({ collection: 'pandao_sessions' })
    homePandaoList.value = pd || []
    await resolveCloudListField(homePandaoList.value, 'cover')
    // 固定盘道活动配置
    const pf = await adminSettingsGet({ group: 'pandao' })
    homePandaoFixed.value = Array.isArray(pf.configs.fixed) ? pf.configs.fixed : []
    pandaoBanners.value = Array.isArray(pf.configs.banners) ? pf.configs.banners.slice(0, MAX_PD_BANNERS) : []
    refreshPandaoBannerUrls()
  } catch (e) {}
}

/* 盘道管理: 场次列表 + 固定规则配置 */
async function loadPandaoConfig() {
  try {
    const pd = await adminList({ collection: 'pandao_sessions' })
    homePandaoList.value = pd || []
    await resolveCloudListField(homePandaoList.value, 'cover')
    const pf = await adminSettingsGet({ group: 'pandao' })
    homePandaoFixed.value = Array.isArray(pf.configs.fixed) ? pf.configs.fixed : []
    pandaoBanners.value = Array.isArray(pf.configs.banners) ? pf.configs.banners.slice(0, MAX_PD_BANNERS) : []
    refreshPandaoBannerUrls()
  } catch (e) {}
}

async function saveHomeConfig() {
  try {
    await adminSettingsSave({ group: 'home', configs: { show_recommend: homeCfg.value.show_recommend ? '1' : '0', show_publish: homeCfg.value.show_publish ? '1' : '0', show_pandao: homeCfg.value.show_pandao ? '1' : '0', show_live: homeCfg.value.show_live ? '1' : '0', show_follow: homeCfg.value.show_follow ? '1' : '0', show_wechat_login: homeCfg.value.show_wechat_login ? '1' : '0' } })
    await adminSettingsSave({ group: 'recommend', configs: { rec_show_live: homeCfg.value.rec_show_live ? '1' : '0', rec_show_pandao: homeCfg.value.rec_show_pandao ? '1' : '0', rec_show_product: homeCfg.value.rec_show_product ? '1' : '0', rec_show_course: homeCfg.value.rec_show_course ? '1' : '0', rec_show_moment: homeCfg.value.rec_show_moment ? '1' : '0' } })
    await adminSettingsSave({ group: 'mypage', configs: { show_tools: homeCfg.value.show_tools ? '1' : '0' } })
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  }
}

/* 动态发布权限: 加载/保存 */
async function loadMomentConfig() {
  try {
    const res = await adminSettingsGet({ group: 'moment' })
    const cfg = res.configs || {}
    momentCfg.value = { allow_publish_moment: cfg.allow_publish_moment !== '0' && cfg.allow_publish_moment !== false }
  } catch (e) { /* 默认允许 */ }
}

async function saveMomentConfig() {
  try {
    await adminSettingsSave({ group: 'moment', configs: { allow_publish_moment: momentCfg.value.allow_publish_moment ? '1' : '0' } })
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  }
}

async function addPandaoSession() {
  const f = pdForm.value
  if (!f.title.trim()) return uni.showToast({ title: '请输入活动标题', icon: 'none' })
  try {
    const covers = (f.covers || []).slice(0, MAX_PD_COVERS)
    if (f.id) {
      await adminPandaoUpdate({ id: f.id, title: f.title.trim(), day: f.day, start_date: f.start_date, time: f.time.trim(), place: f.place.trim(), price: f.price.trim(), desc: f.desc.trim(), content: f.content.trim(), status: f.status, cover: covers[0] || '', covers })
      uni.showToast({ title: '已保存', icon: 'success' })
    } else {
      await adminPandaoCreate({ title: f.title.trim(), day: f.day, start_date: f.start_date, time: f.time.trim(), place: f.place.trim(), price: f.price.trim(), desc: f.desc.trim(), content: f.content.trim(), status: f.status, cover: covers[0] || '', covers })
      uni.showToast({ title: '已添加', icon: 'success' })
    }
    pdForm.value = emptyPdForm()
    await loadPandaoConfig()
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  }
}

/* 编辑场次 */
function editPandaoSession(pd) {
  pdForm.value = {
    id: pd.id,
    title: pd.title || '',
    day: pd.day || '',
    start_date: pd.start_date || '',
    time: pd.time || '', 
    place: pd.place || '',
    price: pd.price || '',
    desc: pd.desc || '',
    content: pd.content || '',
    status: pd.status || '即将开始',
    cover: pd.cover || '',
    // 兼容旧数据: 没有 covers 字段的场次用单图 cover 构造数组
    covers: Array.isArray(pd.covers) && pd.covers.length ? pd.covers.slice() : (pd.cover ? [pd.cover] : []),
    _coverUrls: [],
  }
  refreshPdCoverUrls()
}

/* 盘道多封面: cloud:// fileID → 签名 URL (私有桶, 直接渲染不显示) */
async function refreshPdCoverUrls() {
  const covers = pdForm.value.covers || []
  const urls = await Promise.all(covers.map((c) => resolveCloudUrl(c).catch(() => '')))
  pdForm.value._coverUrls = urls
}

/* ===== 首页盘道动态轮播图 ===== */
async function refreshPandaoBannerUrls() {
  const urls = await Promise.all((pandaoBanners.value || []).map((c) => resolveCloudUrl(c).catch(() => '')))
  pandaoBannerUrls.value = urls
}

function uploadPandaoBanner() {
  const room = MAX_PD_BANNERS - (pandaoBanners.value || []).length
  if (room <= 0) {
    uni.showToast({ title: `最多 ${MAX_PD_BANNERS} 张`, icon: 'none' })
    return
  }
  uni.chooseImage({
    count: room,
    sizeType: ['compressed'],
    success: async (res) => {
      const files = res.tempFilePaths || []
      if (!files.length) return
      uni.showLoading({ title: '上传中...' })
      const okIds = []
      try {
        const storage = await getStorage()
        if (!storage || !storage.uploadFile) throw new Error('云存储不可用')
        for (let i = 0; i < files.length; i++) {
          try {
            const cloudPath = 'pandao/banner_' + Date.now() + '_' + Math.floor(Math.random() * 1000) + '.png'
            const upRes = await storage.uploadFile(files[i], cloudPath)
            const fileID = upRes.fileID || (upRes.file && upRes.file.fileID)
            if (fileID) okIds.push(fileID)
          } catch (e2) {
            console.error('[盘道轮播] 第 ' + (i + 1) + ' 张上传失败', e2)
          }
        }
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: uploadErrMsg(e), icon: 'none' })
        return
      }
      uni.hideLoading()
      if (!okIds.length) {
        uni.showToast({ title: '上传失败，请重试', icon: 'none' })
        return
      }
      pandaoBanners.value = (pandaoBanners.value || []).concat(okIds).slice(0, MAX_PD_BANNERS)
      await refreshPandaoBannerUrls()
      await savePandaoBanners(true)
    },
  })
}

async function removePandaoBanner(idx) {
  const list = (pandaoBanners.value || []).slice()
  if (idx < 0 || idx >= list.length) return
  list.splice(idx, 1)
  pandaoBanners.value = list
  await refreshPandaoBannerUrls()
  await savePandaoBanners(true)
}

/* 保存轮播图到 settings(pandao 组) 的 banners 字段; adminSettingsSave 是字段级合并, 不影响同组 fixed */
async function savePandaoBanners(silent) {
  try {
    await adminSettingsSave({ group: 'pandao', configs: { banners: pandaoBanners.value || [] } })
    if (!silent) uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  }
}

function previewPandaoBanner(idx) {
  const urls = (pandaoBannerUrls.value || []).filter(Boolean)
  if (!urls.length) return
  uni.previewImage({ urls, current: typeof idx === 'number' ? idx : 0 })
}

/* 盘道场次排序: 交换 sort (后台顺序与首页推荐页同步) */
async function movePandao(pd, dir) {
  const list = homePandaoList.value
  const idx = list.findIndex((x) => x.id === pd.id)
  if (idx < 0) return
  const target = idx + dir
  if (target < 0 || target >= list.length) return uni.showToast({ title: dir < 0 ? '已在最前' : '已在最后', icon: 'none' })
  const a = list[idx]
  const b = list[target]
  try {
    await adminPandaoUpdate({ id: a.id, sort: b.sort || b.id })
    await adminPandaoUpdate({ id: b.id, sort: a.sort || a.id })
    uni.showToast({ title: '已调整顺序', icon: 'none' })
    await loadPandaoConfig()
  } catch (e) {
    uni.showToast({ title: '调整失败: ' + (e.message || ''), icon: 'none' })
  }
}

/* 直播排序: 交换 sort (推荐页直播顺序同步) */
async function moveLive(l, dir) {
  const list = lives.value
  const idx = list.findIndex((x) => x.id === l.id)
  if (idx < 0) return
  const target = idx + dir
  if (target < 0 || target >= list.length) return uni.showToast({ title: dir < 0 ? '已在最前' : '已在最后', icon: 'none' })
  const a = list[idx]
  const b = list[target]
  try {
    await adminLiveUpdate({ id: a.id, sort: b.sort || b.id })
    await adminLiveUpdate({ id: b.id, sort: a.sort || a.id })
    uni.showToast({ title: '已调整顺序', icon: 'none' })
    await loadModule('lives')
  } catch (e) {
    uni.showToast({ title: '调整失败: ' + (e.message || ''), icon: 'none' })
  }
}

async function deletePandaoSession(pd) {
  uni.showModal({
    title: '删除场次',
    content: '确认删除「' + pd.title + '」吗？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await adminPandaoDelete({ id: pd.id })
        uni.showToast({ title: '已删除', icon: 'success' })
        await loadPandaoConfig()
      } catch (e) {}
    },
  })
}

async function loadOrders() {
  orders.value = await adminList({ collection: 'orders', status: orderFilter.value, order_type: orderTypeFilter.value })
}

/* 对账修复: 微信已支付但回调丢失的订单自动同步状态 (后台一键修复) */
async function reconcileOrders() {
  uni.showModal({
    title: '对账修复',
    content: '将逐个核对待付款订单的微信支付状态，已支付但未同步的订单会自动更新为已支付。确定执行？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        uni.showLoading({ title: '对账中...' })
        const r = await adminOrderReconcile({})
        uni.hideLoading()
        const fixed = (r && r.fixed) || []
        const closed = (r && r.closed) || []
        uni.showToast({
          title: fixed.length ? `已修复 ${fixed.length} 笔` : '无异常订单',
          icon: 'none',
        })
        if (fixed.length || closed.length) {
          const names = fixed.slice(0, 8).join(', ') + (fixed.length > 8 ? '...' : '')
          uni.showModal({
            title: '对账完成',
            content: `已同步支付 ${fixed.length} 笔${closed.length ? '；关闭 ' + closed.length + ' 笔' : ''}\n${names}`,
            showCancel: false,
          })
        }
        await loadOrders()
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '对账失败: ' + (e.message || ''), icon: 'none' })
      }
    },
  })
}

/* 订单分类: 兼容历史无 order_type 订单 (course_id 判定) + 订单号前缀 (TL/RC/AP) */
function classifyOrder(o) {
  let t = o.order_type || (o.course_id ? 'course' : 'product')
  const no = String(o.order_no || '')
  if (!o.order_type) {
    if (no.startsWith('TL')) t = 'tool_unlock'
    else if (no.startsWith('RC')) t = 'recharge'
    else if (no.startsWith('AP')) t = 'appointment'
  }
  return t
}

/* 下单时间: 显示完整 "2026/8/19 12:30" (云函数已转东八区, 格式 "2026/8/19 11:12:46") */
function fmtOrderTime(s) {
  if (!s) return '-'
  const m = String(s).match(/(\d+)\/(\d+)\/(\d+) (\d+:\d+)/)
  return m ? `${m[1]}/${m[2]}/${m[3]} ${m[4]}` : String(s)
}

/* 订单排序: 默认按下单时间倒序 (最新在上); 金额/下单时间 表头可切换升降序 */
const orderSort = ref({ key: 'created_at', dir: 'desc' })
const sortedOrders = computed(() => {
  const { key, dir } = orderSort.value
  const mul = dir === 'asc' ? 1 : -1
  return [...orders.value].sort((a, b) => {
    let va, vb
    if (key === 'amount') {
      va = Number(a.total_price) || 0
      vb = Number(b.total_price) || 0
    } else {
      // 优先用云函数附加的时间戳 _ts, 回退解析 created_at 字符串
      va = a._ts || Date.parse(String(a.created_at || '').replace(/-/g, '/')) || 0
      vb = b._ts || Date.parse(String(b.created_at || '').replace(/-/g, '/')) || 0
    }
    return (va - vb) * mul || String(a.order_no || '').localeCompare(String(b.order_no || '')) * mul
  })
})
function toggleOrderSort(key) {
  if (orderSort.value.key === key) {
    orderSort.value = { key, dir: orderSort.value.dir === 'desc' ? 'asc' : 'desc' }
  } else {
    orderSort.value = { key, dir: 'desc' }
  }
}
function orderSortArrow(key) {
  if (orderSort.value.key !== key) return '⇅'
  return orderSort.value.dir === 'desc' ? '↓' : '↑'
}

/* 订单分类统计: 商品/课程/AI解盘/预约/充值 各自单数+金额 (与订单分析口径一致, 兼容历史订单) */
const orderTypeStats = computed(() => {
  const types = [
    { key: 'product', label: '商品' },
    { key: 'course', label: '课程' },
    { key: 'tool_unlock', label: 'AI解盘' },
    { key: 'appointment', label: '预约' },
    { key: 'recharge', label: '充值' },
  ]
  return types.map((t) => {
    const list = orders.value.filter((o) => classifyOrder(o) === t.key)
    return {
      ...t,
      count: list.length,
      amount: list.reduce((s, o) => s + Number(o.total_price || 0), 0),
    }
  })
})

/* ===== 订单分析 ===== */
const analysisPie = ref([])
const analysisRanking = ref([])
const analysisProducts = ref([])
/* 时间范围筛选: all=全部 week=近一周 month=近一月 quarter=近一季度 year=近一年 */
const analysisRange = ref('all')
const analysisRangeOptions = [
  { value: 'all', label: '全部' },
  { value: 'week', label: '近一周' },
  { value: 'month', label: '近一月' },
  { value: 'quarter', label: '近一季度' },
  { value: 'year', label: '近一年' },
]
function switchAnalysisRange(v) {
  if (analysisRange.value === v) return
  analysisRange.value = v
  loadOrderAnalysis()
}
/* 产品销售统计排序: key='count'|'amount', dir='desc'|'asc', 默认销售额降序 */
const productSort = ref({ key: 'amount', dir: 'desc' })
const analysisProductsSorted = computed(() => {
  const { key, dir } = productSort.value
  const mul = dir === 'asc' ? 1 : -1
  return [...analysisProducts.value].sort((a, b) => (a[key] - b[key]) * mul || a.name.localeCompare(b.name, 'zh') * mul)
})
/* 点击表头切换排序: 同列切换升降序, 换列默认降序 */
function toggleProductSort(key) {
  if (productSort.value.key === key) {
    productSort.value = { key, dir: productSort.value.dir === 'desc' ? 'asc' : 'desc' }
  } else {
    productSort.value = { key, dir: 'desc' }
  }
}
function sortArrow(key) {
  if (productSort.value.key !== key) return '⇅'
  return productSort.value.dir === 'desc' ? '↓' : '↑'
}
const pieColors = ['#c4753a', '#6e8b4e', '#8b6a9e', '#b85c5c', '#4a7ba6']
const analysisTotalCount = computed(() => analysisPie.value.reduce((s, p) => s + p.count, 0))
const analysisTotalAmount = computed(() => analysisPie.value.reduce((s, p) => s + p.amount, 0))
const PIE_C = 2 * Math.PI * 40
const pieSegments = computed(() => {
  const items = analysisPie.value
  if (!items.length) return { count: [], amount: [] }
  const tc = analysisTotalCount.value || 1
  const ta = analysisTotalAmount.value || 1
  let accC = 0, accA = 0
  const count = items.map((p, i) => {
    const ratio = p.count / tc
    const seg = ratio * PIE_C
    const s = { color: pieColors[i % pieColors.length], dash: `${seg} ${PIE_C - seg}`, offset: -accC, angle: ratio * 360 }
    accC += seg
    return s
  })
  const amount = items.map((p, i) => {
    const ratio = p.amount / ta
    const seg = ratio * PIE_C
    const s = { color: pieColors[i % pieColors.length], dash: `${seg} ${PIE_C - seg}`, offset: -accA, angle: ratio * 360 }
    accA += seg
    return s
  })
  return { count, amount }
})
/* 环形图背景: conic-gradient (微信小程序不支持 <svg> 渲染, 用 CSS 渐变跨端显示饼图) */
function ringStyle(kind) {
  const segs = kind === 'count' ? pieSegments.value.count : pieSegments.value.amount
  if (!segs.length) return ''
  let acc = 0
  const parts = segs.map((s) => {
    const start = acc
    acc += s.angle
    return `${s.color} ${start}deg ${acc}deg`
  })
  return `background: conic-gradient(${parts.join(', ')});`
}
function pct(val, total) {
  if (!total) return '0%'
  return ((val / total) * 100).toFixed(1) + '%'
}

async function loadOrderAnalysis() {
  try {
    const res = await adminOrderAnalysis({ range: analysisRange.value })
    analysisPie.value = res.pieData || []
    analysisRanking.value = res.ranking || []
    analysisProducts.value = res.products || []
    productSort.value = { key: 'amount', dir: 'desc' }
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  }
}

/* 反馈管理 */
const feedbacks = ref([])
const showFeedbackReply = ref(false)
const replyForm = ref({ id: null, reply: '' })

async function loadFeedbacks() {
  feedbacks.value = await adminFeedbacksList()
  // 反馈图片 cloud:// → 可访问 URL (H5 渲染)
  for (const f of feedbacks.value) {
    if (f.images && f.images.length) {
      f._imgs = await Promise.all(f.images.map((src) => resolveCloudUrl(src)))
    }
  }
}

function openFeedbackReply(f) {
  replyForm.value = { id: f.id, reply: f.reply || '' }
  showFeedbackReply.value = true
}

/* 预览反馈图片 */
function previewFbImg(f, i) {
  uni.previewImage({ urls: f._imgs, current: f._imgs[i] })
}

async function saveFeedbackReply() {
  await adminFeedbackReply({ id: replyForm.value.id, reply: replyForm.value.reply })
  showFeedbackReply.value = false
  uni.showToast({ title: '已回复', icon: 'success' })
  await loadFeedbacks()
}

function deleteFeedback(f) {
  uni.showModal({
    title: '删除反馈',
    content: '确定删除该条反馈吗？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await adminFeedbackDelete({ id: f.id })
        uni.showToast({ title: '已删除', icon: 'none' })
        await loadFeedbacks()
      } catch (e) {
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    },
  })
}

/* ===== 售后管理 ===== */
const aftersales = ref([])
const aftersaleFilter = ref('全部')
const aftersaleKeyword = ref('')
const aftersaleStatusOptions = ['全部', '待处理', '处理中', '已处理']
const showAftersaleHandle = ref(false)
const asHandleForm = ref({ rec: null, status: '已处理', reply: '' })
/* 同一订单的多条售后反馈分组: 最早一条为主条目, 后续为子条目 (↳ 后续反馈 #N)
 * 组间按组内最新反馈时间倒序 (最新订单在前) */
const aftersaleRows = computed(() => {
  const kw = (aftersaleKeyword.value || '').trim().toLowerCase()
  const list = kw
    ? aftersales.value.filter((a) => {
        const nick = (a.nickname || '').toLowerCase()
        const ord = String(a.order_no || '').toLowerCase()
        return nick.includes(kw) || ord.includes(kw)
      })
    : aftersales.value
  const groups = new Map() // order_no → rows
  for (const a of list) {
    const key = String(a.order_no || ('uid_' + a.uid + '_' + a.id))
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(a)
  }
  const rows = []
  // 组间: 按组内最大 id (最新反馈) 降序
  const ordered = [...groups.entries()].sort((x, y) => Math.max(...y[1].map(r => Number(r.id) || 0)) - Math.max(...x[1].map(r => Number(r.id) || 0)))
  for (const [, glist] of ordered) {
    // 组内: 按 id 升序, 最早一条为主条目
    glist.sort((x, y) => (Number(x.id) || 0) - (Number(y.id) || 0))
    glist.forEach((a, i) => {
      rows.push({ ...a, _isSub: i > 0, _subIdx: i, _groupCount: glist.length })
    })
  }
  return rows
})

async function loadAftersales() {
  aftersales.value = await adminAftersalesList({ status: aftersaleFilter.value })
  // 售后图片 cloud:// → 可访问 URL (H5 渲染)
  for (const a of aftersales.value) {
    if (a.images && a.images.length) {
      a._imgs = await Promise.all(a.images.map((src) => resolveCloudUrl(src)))
    }
  }
}

function openAftersaleHandle(a) {
  asHandleForm.value = { rec: a, status: a.status === '待处理' ? '处理中' : (a.status || '已处理'), reply: a.reply || '' }
  showAftersaleHandle.value = true
}

function previewAsImg(a, i) {
  if (a._imgs && a._imgs.length) uni.previewImage({ urls: a._imgs, current: a._imgs[i] })
}

async function saveAftersaleReply() {
  await adminAftersaleReply({ id: asHandleForm.value.rec.id, status: asHandleForm.value.status, reply: asHandleForm.value.reply })
  showAftersaleHandle.value = false
  uni.showToast({ title: '已处理', icon: 'success' })
  await loadAftersales()
}

function deleteAftersale(a) {
  uni.showModal({
    title: '删除售后记录',
    content: `确定删除订单 ${a.order_no} 的这条售后记录吗？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await adminAftersaleDelete({ id: a.id })
        uni.showToast({ title: '已删除', icon: 'none' })
        await loadAftersales()
      } catch (e) {
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    },
  })
}

/* ===== 小程序接管 (微信第三方平台扫码授权) ===== */
const wxmpList = ref([])
const showWxmpBind = ref(false)
const wxmpAppid = ref('')
const wxmpBinding = ref(false)
const wxmpAuthUrl = ref('')
const showWxmpQr = ref(false)
const wxmpQrB64 = ref('')

async function loadWxmp() {
  try {
    wxmpList.value = await wxmpListBound()
  } catch (e) {
    wxmpList.value = []
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  }
}
function openWxmpBind() {
  wxmpAppid.value = ''
  wxmpAuthUrl.value = ''
  showWxmpBind.value = true
}
async function doWxmpBind() {
  const appid = wxmpAppid.value.trim()
  if (!/^wx[a-f0-9]{16}$/i.test(appid)) {
    uni.showToast({ title: 'AppID 格式不正确', icon: 'none' })
    return
  }
  wxmpBinding.value = true
  try {
    const res = await wxmpGetAuthUrl({ appid })
    wxmpAuthUrl.value = res.auth_url
  } catch (e) {
    uni.showToast({ title: e.message || '生成授权链接失败', icon: 'none' })
  } finally {
    wxmpBinding.value = false
  }
}
function copyWxmpAuthUrl() {
  uni.setClipboardData({
    data: wxmpAuthUrl.value,
    success: () => uni.showToast({ title: '已复制，请用管理员微信打开', icon: 'none' }),
  })
}
async function wxmpQr(m) {
  try {
    const res = await wxmpGetExperienceQr({ appid: m.appid })
    if (res.qr_b64) {
      wxmpQrB64.value = res.qr_b64
      showWxmpQr.value = true
    } else {
      uni.showToast({ title: '获取失败：' + (res.msg || '请先上传开发版'), icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: e.message || '获取体验码失败', icon: 'none' })
  }
}
async function wxmpUp(m) {
  uni.showModal({
    title: '上传开发版',
    content: `确定将当前代码(v2.0.0)上传为 ${m.appid} 的开发版吗？（需开放平台已有代码模板）`,
    confirmText: '上传',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await wxmpUploadCode({ appid: m.appid, user_version: '2.0.0', user_desc: '道元易学 v2.0.0' })
        uni.showToast({ title: '已上传开发版', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: uploadErrMsg(e), icon: 'none' })
      }
    },
  })
}
async function wxmpAudit(m) {
  uni.showModal({
    title: '提交审核',
    content: `确定将 ${m.appid} 的当前版本提交微信审核吗？`,
    confirmText: '提审',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await wxmpSubmitAudit({ appid: m.appid })
        uni.showToast({ title: '已提交审核', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '提审失败', icon: 'none' })
      }
    },
  })
}
async function wxmpPub(m) {
  uni.showModal({
    title: '发布上线',
    content: `确定将 ${m.appid} 的已审核版本发布上线吗？（正式生效）`,
    confirmText: '发布',
    confirmColor: '#9c1630',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await wxmpRelease({ appid: m.appid })
        uni.showToast({ title: '已发布上线', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '发布失败', icon: 'none' })
      }
    },
  })
}

/* 分配道号 / 角色弹窗 (超管) */
const showAssignId = ref(false)
const showCreateUser = ref(false)
const createForm = ref({ phone: '', nickname: '', password: '123456', role: 'staff' })
const assignForm = ref({ uid: null, dao_code: '', role: 'user', nickname: '' })
/* 编辑弹窗角色: 超级管理员(仅超管可任命)/操作管理员/管理员(只读)/内部员工/普通用户(超管可降级) */
const editRoleOptions = [
  { value: 'admin', label: '超级管理员' },
  { value: 'operator', label: '操作管理员' },
  { value: 'manager', label: '管理员' },
  { value: 'staff', label: '内部员工' },
  { value: 'user', label: '普通用户' },
]
/* 新建员工/管理员角色 */
const createRoleOptions = [
  { value: 'staff', label: '内部员工' },
  { value: 'operator', label: '操作管理员' },
  { value: 'manager', label: '管理员' },
  { value: 'admin', label: '超级管理员' },
]

const assignMode = ref('edit') // 'edit' | 'assign'
function openAssignId(u) {
  assignMode.value = 'assign'
  assignForm.value = { uid: u.uid, dao_code: u.dao_code || '', role: u.role || 'user', nickname: u.nickname || '', remark: u.remark || '' }
  showAssignId.value = true
}
function openEditUser(u) {
  assignMode.value = 'edit'
  assignForm.value = { uid: u.uid, dao_code: u.dao_code || '', role: u.role || 'user', nickname: u.nickname || '', remark: u.remark || '' }
  showAssignId.value = true
}

async function saveAssignId() {
  const dao = String(assignForm.value.dao_code || '').trim().toUpperCase()
  if (assignMode.value === 'assign' && !dao) {
    uni.showToast({ title: '请输入道号ID', icon: 'none' })
    return
  }
  // 编辑模式: 角色变更仅弹一次确认; 分配道号: 双重确认
  const confirmChain = (fn) => {
    if (assignMode.value === 'edit') {
      fn()
      return
    }
    uni.showModal({
      title: '确认修改道号',
      content: '确定将道号修改为 ' + dao + ' 吗？',
      success: (r1) => {
        if (!r1.confirm) return
        uni.showModal({
          title: '再次确认',
          content: '道号是用户唯一身份标识，修改后不可自动恢复，请再次确认！',
          success: (r2) => {
            if (!r2.confirm) return
            fn()
          },
        })
      },
    })
  }
  confirmChain(() => doSaveAssignId(dao))
}

async function doSaveAssignId(dao) {
  try {
    const payload = { uid: assignForm.value.uid, role: assignForm.value.role }
    if (dao) payload.dao_code = dao
    if (assignMode.value === 'edit') payload.remark = String(assignForm.value.remark || '').slice(0, 200)
    if (assignMode.value === 'edit' && assignForm.value.nickname) {
      payload.nickname = assignForm.value.nickname
    }
    await adminUserUpdate(payload)
    showAssignId.value = false
    uni.showToast({ title: assignMode.value === 'edit' ? '已保存' : '已分配', icon: 'success' })
    await loadModule('users')
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  }
}

function goFront() {
  uni.switchTab({ url: '/pages/index/index' })
}

/* 版本号点击: 显示完整版本+构建信息 (便于确认加载的是否最新版) */
function showVersion() {
  uni.showModal({
    title: '当前版本',
    content: `${APP_VERSION}（commit ${APP_COMMIT}）\n构建日期：${APP_BUILD_DATE}\n\n若此版本号不是最新，请关闭标签页重开并强制刷新（Cmd/Ctrl+Shift+R）`,
    showCancel: false,
    confirmText: '知道了',
  })
}

/* 旋转屏幕: 管理后台横屏完整显示 (小程序/App/H5 多端支持) */
let isLandscape = false
function rotateScreen() {
  const target = isLandscape ? 'portrait' : 'landscape'
  const done = () => { isLandscape = !isLandscape }
  const fail = () => uni.showToast({ title: '当前环境不支持自动旋转，请手动旋转手机横屏', icon: 'none' })
  // #ifdef MP-WEIXIN
  // 小程序: 需页面配置 pageOrientation, 动态切换全屏方向
  try {
    uni.setPageOrientation({
      pageOrientation: target,
      success: done,
      fail,
    })
    return
  } catch (e) { fail(); return }
  // #endif
  // #ifdef APP-PLUS
  try {
    // plus 原生旋转 (App)
    plus.screen.lockOrientation(target === 'landscape' ? 'landscape-primary' : 'portrait-primary')
    done()
    return
  } catch (e) { fail(); return }
  // #endif
  // #ifdef H5
  // H5 原生 API
  try {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock(target).then(done).catch(fail)
    } else {
      fail()
    }
  } catch (e) {
    fail()
  }
  // #endif
}

function logout() {
  uni.showModal({
    title: '提示',
    content: '确定退出管理后台吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.redirectTo({ url: '/pages-sub/admin/login' })
      }
    },
  })
}

/* 商品 */
const showProduct = ref(false)
const productForm = ref({})
/* 商品图片: 预览 / 上传 / 删除 */
const productImages = computed(() =>
  (productForm.value.imagesText || '').split(',').map((s) => s.trim()).filter(Boolean)
)
function removeProductImg(i) {
  const arr = (productForm.value.imagesText || '').split(',').map((s) => s.trim()).filter(Boolean)
  arr.splice(i, 1)
  productForm.value.imagesText = arr.join(',')
}
function uploadCourseCover() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (res) => {
      const filePath = res.tempFilePaths[0]
      uni.showLoading({ title: '上传中...' })
      try {
        const storage = await getStorage()
        if (!storage || !storage.uploadFile) throw new Error('云存储不可用')
        const cloudPath = 'covers/c' + Date.now() + '_' + Math.floor(Math.random() * 1000) + '.png'
        const upRes = await storage.uploadFile(filePath, cloudPath)
        const fileID = upRes.fileID || (upRes.file && upRes.file.fileID)
        if (!fileID) throw new Error('上传失败')
        const url = fileID
          .replace(/^cloud:\/\/[^\/]+\//, 'https://636c-cloud1-d8gs2k9m311f7272f-1464523137.tcb.qcloud.la/')
        courseForm.value.cover = url
        uni.showToast({ title: '封面已上传', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: uploadErrMsg(e), icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  })
}

/* 列表封面转换: cloud:// fileID → _coverUrl (保留原 cover, 供编辑回传持久 fileID) */
async function resolveCloudListField(list, field = 'cover') {
  if (!Array.isArray(list) || !list.length) return
  await Promise.all(list.map(async (item) => {
    if (item && item[field] && !item._coverUrl) {
      item._coverUrl = await resolveCloudUrl(item[field]).catch(() => '')
    }
  }))
}

/* 盘道封面: 多图上传 (详情页左右滑动轮播) */
function uploadPandaoCover() {
  const room = MAX_PD_COVERS - (pdForm.value.covers || []).length
  if (room <= 0) {
    uni.showToast({ title: `最多 ${MAX_PD_COVERS} 张`, icon: 'none' })
    return
  }
  uni.chooseImage({
    count: room,
    sizeType: ['compressed'],
    success: async (res) => {
      const files = res.tempFilePaths || []
      if (!files.length) return
      uni.showLoading({ title: '上传中...' })
      const okIds = []
      try {
        const storage = await getStorage()
        if (!storage || !storage.uploadFile) throw new Error('云存储不可用')
        for (let i = 0; i < files.length; i++) {
          const filePath = files[i]
          // 逐张上传: 单张失败不拖垮整批 (大图会走 COS 直传, 由 cloudbase.js 自动处理)
          try {
            const cloudPath = 'pandao/p' + Date.now() + '_' + Math.floor(Math.random() * 1000) + '.png'
            const upRes = await storage.uploadFile(filePath, cloudPath)
            const fileID = upRes.fileID || (upRes.file && upRes.file.fileID)
            if (fileID) okIds.push(fileID)
          } catch (e2) {
            console.error('[盘道封面] 第 ' + (i + 1) + ' 张上传失败', e2)
          }
        }
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: uploadErrMsg(e), icon: 'none' })
        return
      }
      uni.hideLoading()
      if (!okIds.length) {
        uni.showToast({ title: '上传失败，请重试', icon: 'none' })
        return
      }
      // 追加到 covers (超出上限截断), 并同步首图 cover
      const covers = (pdForm.value.covers || []).concat(okIds).slice(0, MAX_PD_COVERS)
      pdForm.value.covers = covers
      pdForm.value.cover = covers[0] || ''
      await refreshPdCoverUrls()
      uni.showToast({ title: `已上传 ${okIds.length} 张`, icon: 'success' })
    },
  })
}

/* 盘道封面: 移除指定一张 */
async function removePandaoCover(idx) {
  const covers = (pdForm.value.covers || []).slice()
  if (idx < 0 || idx >= covers.length) return
  covers.splice(idx, 1)
  pdForm.value.covers = covers
  pdForm.value.cover = covers[0] || ''
  await refreshPdCoverUrls()
}

function previewPandaoCover(idx) {
  const urls = (pdForm.value._coverUrls || []).filter(Boolean)
  if (!urls.length) return
  uni.previewImage({ urls, current: typeof idx === 'number' ? idx : 0 })
}

/* 直播封面: 上传 (表单 UI 在直播弹窗) */
function uploadLiveCover() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (res) => {
      const filePath = res.tempFilePaths[0]
      uni.showLoading({ title: '上传中...' })
      try {
        const storage = await getStorage()
        if (!storage || !storage.uploadFile) throw new Error('云存储不可用')
        const cloudPath = 'lives/l' + Date.now() + '_' + Math.floor(Math.random() * 1000) + '.png'
        const upRes = await storage.uploadFile(filePath, cloudPath)
        const fileID = upRes.fileID || (upRes.file && upRes.file.fileID)
        if (!fileID) throw new Error('上传失败')
        liveForm.value.cover = fileID
        liveForm.value._coverUrl = await resolveCloudUrl(fileID).catch(() => '')
        uni.showToast({ title: '封面已上传', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: uploadErrMsg(e), icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  })
}

function uploadProductImg() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (res) => {
      const filePath = res.tempFilePaths[0]
      uni.showLoading({ title: '上传中...' })
      try {
        const storage = await getStorage()
        if (!storage || !storage.uploadFile) throw new Error('云存储不可用')
        const cloudPath = `goods/p${Date.now()}_${Math.floor(Math.random() * 1000)}.png`
        const upRes = await storage.uploadFile(filePath, cloudPath)
        const fileID = upRes.fileID || (upRes.file && upRes.file.fileID)
        if (!fileID) throw new Error('上传失败')
        const url = fileID
          .replace(/^cloud:\/\/[^/]+\//, 'https://636c-cloud1-d8gs2k9m311f7272f-1464523137.tcb.qcloud.la/')
        const arr = (productForm.value.imagesText || '').split(',').map((s) => s.trim()).filter(Boolean)
        arr.push(url)
        productForm.value.imagesText = arr.join(',')
        uni.showToast({ title: '已上传', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: uploadErrMsg(e), icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  })
}

/* 上传错误信息: 显示完整错误便于排查 */
function uploadErrMsg(e) {
  const raw = e && (e.message || e.msg || e.error || e.code || (typeof e === 'string' ? e : ''));
  console.error('[upload-fail]', e);
  return raw ? String(raw).slice(0, 180) : '上传失败';
}

/* 课程视频上传 (云存储) */
function uploadCourseVideo() {
  uni.chooseVideo({
    count: 1,
    maxDuration: 3600,
    compressed: false,
    success: async (res) => {
      const filePath = res.tempFilePath
      let lastPct = -1
      uni.showLoading({ title: '视频上传中...', mask: true })
      try {
        const storage = await getStorage()
        if (!storage || !storage.uploadFile) throw new Error('云存储不可用')
        const cloudPath = `course_videos/v${Date.now()}_${Math.floor(Math.random() * 1000)}.mp4`
        const upRes = await storage.uploadFile(filePath, cloudPath, (ratio, _u, _s, info) => {
          const pct = Math.min(99, Math.floor(ratio * 100))
          if (pct !== lastPct && pct % 2 === 0) {
            lastPct = pct
            const sp = info && info.speedBps ? ' ' + formatSpeed(info.speedBps) : ''
            uni.showLoading({ title: '上传中 ' + pct + '%' + sp, mask: true })
          }
        })
        const fileID = upRes.fileID || (upRes.file && upRes.file.fileID)
        if (!fileID) throw new Error('上传失败')
        const url = fileID.replace(/^cloud:\/\/[^/]+\//, 'https://636c-cloud1-d8gs2k9m311f7272f-1464523137.tcb.qcloud.la/')
        courseForm.value.video = url
        uni.hideLoading()
        uni.showToast({ title: '视频已上传', icon: 'success' })
        // C/OSS 启用时提示是否搬运到 C/OSS (单视频 → 第一课时)
        await maybeMigrateToOss({ course_id: courseForm.value.id, episode_index: 0, video: courseForm.value.video, course_title: courseForm.value.title })
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: uploadErrMsg(e), icon: 'none' })
      }
    },
  })
}

/* ---- 视频集管理 (多集) ---- */
/* 生成课时唯一 key: v-for 必须用稳定 key, 用索引作 key 会在增删/移动课时时
   DOM 复用错位 → 按钮绑定到错误课时对象 → 暂停/取消"没反应" */
function epKey() {
  return 'ep' + Date.now() + '_' + Math.floor(Math.random() * 100000)
}
function addEpisode() {
  if (!courseForm.value.episodes) courseForm.value.episodes = []
  // 新增课时默认付费 (可在行内切换为免费)
  courseForm.value.episodes.push({ _key: epKey(), title: '', video: '', free: false })
}
function removeEpisode(i) {
  courseForm.value.episodes.splice(i, 1)
}
function moveEpisode(i, dir) {
  const arr = courseForm.value.episodes
  const j = i + dir
  if (j < 0 || j >= arr.length) return
  const t = arr[i]
  arr[i] = arr[j]
  arr[j] = t
}
/* ===== 断点续传记录 (localStorage): 失败/取消后保留已传分片, 下次选同一文件自动续传 ===== */
const RESUME_KEY = 'zhs_upload_resume'
const PART_SIZE_BYTES = 16 * 1024 * 1024
/* 看门狗 (v1.11.310 改为"重连续传"而非"放弃"): SDK 每 10s 上报一次心跳, 故"长时间连心跳都没有"
   = 上传循环真死(事件循环阻塞/请求僵死), 而非"传得慢"。
   判定真死后【重启本轮并用续传点接着传】, 绝不放弃任务、绝不清零进度 (用户要求: 可以慢, 但不能中断)。
   3 分钟 >> 10s 心跳间隔, 慢速上传(哪怕单片十几分钟)也不会被误杀。 */
const UPLOAD_STALL_TIMEOUT_MS = 180 * 1000
const UPLOAD_WATCHDOG_INTERVAL_MS = 15000
function saveResume(rec) {
  try {
    let list = JSON.parse(uni.getStorageSync(RESUME_KEY) || '[]')
    list = list.filter((r) => r.size !== rec.size)
    list.push(rec)
    if (list.length > 10) list = list.slice(-10)
    uni.setStorageSync(RESUME_KEY, JSON.stringify(list))
  } catch (e) {}
}
function findResume(size) {
  try {
    const list = JSON.parse(uni.getStorageSync(RESUME_KEY) || '[]')
    const rec = list.filter((r) => r.size === size && r.uploadId).sort((a, b) => (b.ts || 0) - (a.ts || 0))[0]
    return rec || null
  } catch (e) { return null }
}
function removeResume(size) {
  try {
    let list = JSON.parse(uni.getStorageSync(RESUME_KEY) || '[]')
    list = list.filter((r) => r.size !== size)
    uni.setStorageSync(RESUME_KEY, JSON.stringify(list))
  } catch (e) {}
}
/* 上传速度 / 剩余时间 格式化 (抖音/视频号同款反馈) */
function formatSpeed(bps) {
  if (!bps || bps <= 0) return ''
  if (bps >= 1024 * 1024) return (bps / 1048576).toFixed(1) + ' MB/s'
  if (bps >= 1024) return (bps / 1024).toFixed(0) + ' KB/s'
  return Math.round(bps) + ' B/s'
}
function formatEta(sec) {
  if (!sec || sec <= 0) return '—'
  if (sec < 60) return sec + '秒'
  if (sec < 3600) return Math.floor(sec / 60) + '分' + (sec % 60) + '秒'
  return Math.floor(sec / 3600) + '时' + Math.floor((sec % 3600) / 60) + '分'
}
/* 清除全部断点续传记录 (2026-08-30: 反复取消/失败产生的失效 uploadId 会干扰重新上传, 提供一键清理) */
function clearAllResume() {
  uni.showModal({
    title: '清除断点记录',
    content: '将清除所有课时的未完成上传记录（不会删除已上传的视频分片）。之后重新上传会从头开始。',
    confirmColor: '#9c1630',
    success: (r) => {
      if (!r.confirm) return
      try {
        uni.setStorageSync(RESUME_KEY, '[]')
        uni.showToast({ title: '断点记录已全部清除', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: '清除失败', icon: 'none' })
      }
    },
  })
}
function resumePercent(rec, size) {
  // 自适应分片后, 用记录里保存的真实分片大小估算总分片数(兜底用 16MB)
  const ps = (rec && rec.partSize) || PART_SIZE_BYTES
  const total = Math.max(1, Math.ceil(size / ps))
  return Math.min(99, Math.round(((rec.partNumbers || []).length / total) * 100))
}

/* ===== 上传队列 (2026-08-30 排队策略): 同一时间只允许 1 个课时上传,
   其余选好文件后进入队列等待, 前一个完成/取消/失败后按顺序自动开始下一个 ===== */
const uploadQueue = ref([])        // [{ ep, filePath, fileSize }] 等待上传的课时
let currentUploadingEp = null      // 当前正在上传的课时 (非响应式, 仅流程控制)
let currentUploadingCourseId = null // 当前上传所属课程 id (切换课程时中止残留任务用)
let uploadGenCounter = 0           // 上传任务代号 (取消/急停时自增, 旧任务的进度/结果写入全部失效, 防止污染新任务)
let _dequeueRunning = false        // 同步锁: 防止两个 dequeueNext 异步交叉执行导致队列卡死 (2026-08-31)

/* 出队: 同步锁防竞态 + 对象映射防旧引用 (2026-08-31 根治排队不出队)
   竞态场景: cancel/finally 调 dequeueNext → async yield → 旧 dequeueNext 也 yield →
   两个 dequeueNext 都通过 currentUploadingEp 检查 → 互相覆盖 → 队列卡死 */
async function dequeueNext() {
  if (_dequeueRunning) { console.log('[队列] dequeueNext 已在执行中, 跳过'); return } // 同步锁: 防止并发
  _dequeueRunning = true
  try {
    if (uploadQueue.value.length === 0) { console.log('[队列] 队列为空, 无需出队'); return }
    const item = uploadQueue.value.shift()
    let ep = item && item.ep
    if (!ep || !item.filePath) { console.log('[队列] 出队项无效, 递归跳过'); return } // try/finally 保证 _dequeueRunning 清除
    // 对象映射: 队列中的 ep 可能是旧弹窗的旧对象 (关闭/重开弹窗后 episodes 数组重建),
    // 按 _key 映射到当前 courseForm.episodes 中的对象, 确保 UI 能显示进度
    if (ep._key) {
      const curEp = courseForm.value.episodes && courseForm.value.episodes.find((e) => e._key === ep._key)
      if (curEp && curEp !== ep) { console.log('[队列] ep 对象已映射到当前弹窗'); ep = curEp }
    }
    ep._queued = false
    ep._status = ''
    currentUploadingEp = ep // 先设锁再 await, 配合 _dequeueRunning 双保险
    console.log('[队列] 出队开始上传: ' + (ep.title || '未命名') + ' 剩余排队: ' + uploadQueue.value.length)
    await startUpload(ep, item.filePath, item.fileSize, item.fileObj)
  } finally {
    _dequeueRunning = false
    // 释放锁后检查: 如果队列还有任务但无上传中 (可能被取消清空), 触发出队
    if (uploadQueue.value.length > 0 && !currentUploadingEp) {
      console.log('[队列] 锁释放后发现残留排队项, 重新出队')
      dequeueNext()
    }
  }
}

/* 取消排队 (等待中的课时): 从队列移除, 恢复"上传"按钮
   按 _key 匹配: 队列中的 ep 可能是旧弹窗对象 (关闭/重开后 episodes 重建) (2026-08-31) */
function removeFromQueue(ep) {
  if (!ep) return
  const key = ep._key
  uploadQueue.value = uploadQueue.value.filter((q) => {
    if (!q || !q.ep) return false
    if (q.ep === ep) return false // 同一对象
    if (key && q.ep._key === key) return false // _key 匹配
    return true // 保留
  })
  ep._queued = false
  ep._status = ''
  uni.showToast({ title: '已取消排队', icon: 'none' })
}

/* 是否有进行中的上传 (上传中或排队中) — 控制"终止全部上传"按钮显示 */
const hasActiveUploads = computed(() =>
  (courseForm.value.episodes || []).some((e) => e._uploading || e._queued)
)

/* 强制终止当前课程所有上传 (上传中 + 排队中):
   中断所有分片请求, 保留续传进度, 清空状态与队列 — 解决个别课时暂停/取消失效时无法强制中断的问题 (2026-08-30) */
/* 强制终止当前课程所有上传 (上传中 + 排队中): **立即强制复位 UI**(不依赖底层请求是否真的中断),
   保留续传进度, 清空状态与队列 — 解决个别课时暂停/取消失效时无法强制中断的问题 (2026-08-30) */
function abortAllUploads() {
  let stopped = 0
  courseForm.value.episodes.forEach((ep) => {
    const active = ep._uploading || ep._queued
    if (ep._control) {
      ep._control.cancelled = true
      abortAllParts(ep._control)
      try {
        if (ep._control.uploadId && ep._fileSize) {
          saveResume({ size: ep._fileSize, cloudPath: ep._control.cloudPath || '', uploadId: ep._control.uploadId, partNumbers: ep._control.partNumbers || [], ts: Date.now() })
        }
      } catch (e) {}
      ep._control = null
    }
    ep._uploading = false
    ep._queued = false
    ep._paused = false
    ep._progress = 0
    ep._status = ''
    if (active) stopped++
  })
  uploadQueue.value = []
  currentUploadingEp = null
  uploadGenCounter++ // 使所有旧上传任务的后续副作用全部失效 (gen 隔离)
  uni.showToast({ title: stopped ? `已强制终止 ${stopped} 个上传（进度已保留）` : '当前没有进行中的上传', icon: 'none' })
  if (stopped) setTimeout(() => uni.showToast({ title: '重新选同一文件可续传；想放弃请选文件后点「重新上传」', icon: 'none' }), 1200)
}

/* 上传某一集视频: 选文件 → 若有课时在上传则入队等待, 否则立即开始 (绑定 ep 对象防索引错位) */
function uploadEpisodeVideo(ep) {
  if (!ep) return
  const i = courseForm.value.episodes.indexOf(ep)
  if (i < 0) return
  if (ep._uploading) return uni.showToast({ title: '该课时正在上传中', icon: 'none' })
  if (ep._queued) return uni.showToast({ title: '该课时正在排队等待中', icon: 'none' })
  uni.chooseVideo({
    count: 1,
    maxDuration: 3600,
    compressed: false,
    success: async (res) => {
      const filePath = res.tempFilePath
      const fileSize = Number(res.size) || 0
      // H5 平台 chooseVideo 返回 File 对象 (originalFile): 用它直接 slice 读分片, 避免 fetch 读全文件 (几GB视频会超时/内存爆) (2026-08-30)
      const fileObj = res.originalFile || res.file || null
      console.log('[上传] 选择文件 size=' + fileSize + ' fileObj=' + (fileObj ? '是' : '无'))
      if (currentUploadingEp || uploadQueue.value.length > 0) {
        // 通道被占用 或 队列已有排队 → 一律入队等待 (v1.11.309 修复: 之前仅判 currentUploadingEp,
        // 取消/暂停让位后通道瞬时为空, 此时新上传会绕过队列直接开始 → 表现为"排队机制失效")
        uploadQueue.value.push({ ep, filePath, fileSize, fileObj })
        ep._queued = true
        ep._status = '等待上传'
        ep._progress = 0
        uni.showToast({ title: '已加入上传队列，前一个完成后自动开始', icon: 'none' })
        return
      }
      await startUpload(ep, filePath, fileSize, fileObj)
    },
  })
}

/* ===== 断点续传确认弹窗 (2026-09-02 用户需求) =====
   重新上传同一文件时弹出「继续上传 / 重新上传」, 5 秒未选择 → 默认「继续上传」(自动选断点续传)。
   uni.showModal 的 content 是静态文本且无法程序化关闭, 故用自定义弹窗实现倒计时。 */
const resumeConfirm = ref(null) // { percent: number, left: number } | null
let resumeConfirmResolve = null
let resumeConfirmTimer = null
const RESUME_AUTO_SEC = 5 // 倒计时秒数, 到 0 默认继续上传

function closeResumeConfirm(choice) {
  if (resumeConfirmTimer) { clearInterval(resumeConfirmTimer); resumeConfirmTimer = null }
  resumeConfirm.value = null
  const r = resumeConfirmResolve
  resumeConfirmResolve = null
  if (r) r(choice === true) // true=继续上传(续传), false=重新上传
}

function askResumeConfirm(percent) {
  return new Promise((resolve) => {
    if (resumeConfirmTimer) { clearInterval(resumeConfirmTimer); resumeConfirmTimer = null } // 兜底防重入
    resumeConfirmResolve = resolve
    let left = RESUME_AUTO_SEC
    resumeConfirm.value = { percent, left }
    resumeConfirmTimer = setInterval(() => {
      left -= 1
      if (left <= 0) {
        // 超时未选择 → 默认继续上传(断点续传), 符合"不中断、不重头来"的诉求
        closeResumeConfirm(true)
        uni.showToast({ title: '已默认继续上传', icon: 'none' })
        return
      }
      resumeConfirm.value = { percent, left }
    }, 1000)
  })
}

/* 真正开始上传一个课时 (含断点续传检测; 完成/失败/取消后自动出队下一个) */
async function startUpload(ep, filePath, fileSize, fileObj) {
  const i = courseForm.value.episodes.indexOf(ep)
  // 断点续传检测: 同尺寸文件有未完成上传 → 询问续传
  let resumeInfo = null
  const resume = fileSize ? findResume(fileSize) : null
  if (resume && resume.uploadId) {
    // 5s 未选择 → 默认「继续上传」(v1.11.311)
    const confirmRes = await askResumeConfirm(resumePercent(resume, fileSize))
    if (confirmRes) {
      resumeInfo = { uploadId: resume.uploadId, skipPartNumbers: resume.partNumbers || [] }
    } else {
      removeResume(fileSize)
    }
  }
  currentUploadingEp = ep
  currentUploadingCourseId = courseForm.value.id // 记录所属课程(切课不再中止, 仅用于标识归属)
  // 捕获所属课程/课时坐标 (v1.11.310): 上传期间用户可能切走课程, 届时 courseForm 已指向别的课,
  // 必须用【开始时】捕获的坐标落库与提示, 否则会写错课程
  const myCourseId = courseForm.value.id
  const myEpIndex = i
  const myCourseTitle = courseForm.value.title
  const myGen = ++uploadGenCounter // 任务代号: 取消/急停后旧任务的进度/结果写入全部失效
  ep._uploadGen = myGen
  console.log('[上传] 开始课时 ' + (ep.title || '第' + (i + 1) + '集') + ' gen=' + myGen + ' 续传=' + (resumeInfo ? '是' : '否'))
  const control = { paused: false, cancelled: false, abortFns: new Set(), size: fileSize } // size: chooseVideo 返回, 避免 fetch 读全文件
  // 意图标记: 用于区分"谁中止了这次上传"(用户取消 / 暂停让位 / 卡死重启), 决定是否重试
  control.userCancelled = false // 用户点「取消」→ 不再重试
  control.yieldPause = false    // 用户点「暂停」让位给队列 → 不再重试
  control.timedOut = false      // 看门狗判定真卡死 → 必须重试(不是放弃)
  control.inAttempt = false     // 是否处于"正在传"区间(退避等待期间不计入卡死)
  let lastActivityTs = Date.now() // 心跳/进度/状态事件任一上报都刷新 → 证明"还活着"
  control.watchdog = setInterval(() => {
    if (ep._uploadGen !== myGen) { clearInterval(control.watchdog); return } // 任务过期 → 停止
    if (!control.inAttempt) return            // 退避等待/初始化阶段: 不计入卡死
    if (control.paused || control.cancelled) return // 用户暂停或已取消中: 不算卡死
    if (Date.now() - lastActivityTs > UPLOAD_STALL_TIMEOUT_MS) {
      // 连心跳都没有 → 真卡死: 中止本轮请求(不是放弃任务!), 由重试循环用续传点自动接上
      console.log('[上传看门狗] ' + UPLOAD_STALL_TIMEOUT_MS / 1000 + 's 无任何响应, 自动重连续传(进度保留)')
      control.timedOut = true
      control.cancelled = true
      abortAllParts(control)
    }
  }, UPLOAD_WATCHDOG_INTERVAL_MS)
  ep._control = control
  ep._fileObj = fileObj
  ep._filePath = filePath // 暂停让位后续传用(避免重新选文件)
  ep._fileSize = fileSize // 取消乐观兜底保存续传点用
  ep._uploading = true
  ep._paused = false
  ep._progress = resumeInfo ? resumePercent(resume, fileSize) : 0
  ep._status = resumeInfo ? '续传中…' : ''
  let cloudPath = `course_videos/v${Date.now()}_${Math.floor(Math.random() * 1000)}.mp4`
  control.cloudPath = cloudPath
  let lastSaveTs = 0
  // 断网自动暂停 / 恢复自动继续 (参考百度网盘: 网络恢复后自动续传, 不用手动干预)
  const onNetOffline = () => {
    if (ep._uploading && !ep._control.cancelled) {
      ep._control.paused = true
      ep._paused = true
      ep._status = '网络已断开，等待恢复后自动继续…'
    }
  }
  const onNetOnline = () => {
    if (ep._uploading && ep._paused && !ep._control.cancelled) {
      ep._control.paused = false
      ep._paused = false
      ep._status = ''
    }
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('offline', onNetOffline)
    window.addEventListener('online', onNetOnline)
  }
  const removeNetListeners = () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('offline', onNetOffline)
      window.removeEventListener('online', onNetOnline)
    }
  }
  try {
    ep._status = '初始化中…'
    // 初始化阶段取消检测: 250ms 轮询 cancelled, 点取消立即抛 UPLOAD_CANCELLED, 不必干等 15s 超时
    // (2026-08-30: 用户网络波动时 SDK 匿名登录卡住, 之前取消无 abort 目标 → 表现"暂停/取消没反应")
    const cw = (() => {
      let iv = null
      const promise = new Promise((_, rej) => {
        iv = setInterval(() => {
          if (control.cancelled) {
            clearInterval(iv)
            rej(Object.assign(new Error('上传已取消'), { code: 'UPLOAD_CANCELLED' }))
          }
        }, 250)
      })
      return { promise, stop: () => clearInterval(iv) }
    })()
    let storage
    try {
      // getStorage 加 15s 超时兜底: 防止 SDK 初始化(匿名登录)网络卡住时上传永远 0% 无反应
      storage = await Promise.race([
        getStorage(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('INIT_TIMEOUT')), 15000)),
        cw.promise,
      ])
    } catch (initErr) {
      if (initErr && initErr.code === 'UPLOAD_CANCELLED') throw initErr
      throw new Error('云存储初始化失败（网络波动），请检查网络或关闭代理/VPN 后重试')
    } finally {
      cw.stop()
    }
    if (!storage || !storage.uploadFile) throw new Error('云存储初始化失败（服务未就绪），请刷新页面重试')
    if (control.cancelled) throw Object.assign(new Error('上传已取消'), { code: 'UPLOAD_CANCELLED' })
    if (resumeInfo) { cloudPath = resume.cloudPath; control.cloudPath = cloudPath } // 续传必须用同一 cloudPath
    ep._status = ''
    console.log('[上传] gen=' + myGen + ' 初始化完成, 开始传分片')
    /* ===== 永不放弃重试循环 (v1.11.310) =====
       除【用户主动取消 / 暂停让位 / 急停】外, 任何失败(网络波动、分片失败、合并前补齐失败、
       看门狗判定真卡死)都一律【自动续传重试】, 绝不退出、进度绝不清零 —— 用户要求"可以慢, 但不能中断"。
       每次重试都用已传分片构造续传信息, 从断点接着传, 已传部分不丢。 */
    let attempt = 0
    let upRes = null
    let attemptResume = resumeInfo || null
    while (true) {
      attempt++
      control.inAttempt = true
      try {
        upRes = await storage.uploadFile(filePath, cloudPath, (ratio, uploaded, size, info) => {
          if (ep._uploadGen !== myGen) return // 任务已被取消/急停: 忽略旧任务进度
          lastActivityTs = Date.now() // 心跳/真实进度都算"还活着", 看门狗据此区分慢 vs 卡死
          if (info && info.heartbeat) return // 纯心跳: 不改写显示, 仅刷新活跃时间
          const pct = Math.min(99, Math.round(ratio * 100))
          if (pct !== ep._progress) ep._progress = pct
          // 实时速度 / 预计剩余 (抖音/视频号同款反馈, 让用户看到"在动", 慢网不再以为卡死)
          if (info) { ep._speed = info.speedBps || 0; ep._eta = info.etaSec || 0 }
          // 节流保存续传点 (10s 一次, 防直接关页面丢进度)
          const now = Date.now()
          if (control.uploadId && now - lastSaveTs > 10000) {
            lastSaveTs = now
            saveResume({ size: fileSize, cloudPath, uploadId: control.uploadId, partNumbers: control.partNumbers || [], partSize: control.partSize || PART_SIZE_BYTES, ts: now })
          }
        }, control, (s) => {
          if (ep._uploadGen !== myGen) return
          lastActivityTs = Date.now() // 状态事件也证明还活着
          ep._status = s === 'retrying' ? '网络波动，自动重试中…' : s === 'paused' ? '已暂停' : s === 'resumed' ? '' : s === 'cancelling' ? '正在取消…' : ''
        }, attemptResume || null, fileObj)
        control.inAttempt = false
        break // 上传成功 → 跳出重试循环
      } catch (upErr) {
        control.inAttempt = false
        // 用户主动取消 / 暂停让位 / 任务已过期 → 不重试, 交外层 catch 按取消或让位处理
        if (control.userCancelled || control.yieldPause || ep._uploadGen !== myGen) throw upErr
        if (upErr && upErr.code === 'UPLOAD_CANCELLED' && !control.timedOut) throw upErr
        // 其余(网络错误 / 分片失败 / 补齐失败 / 卡死重启)一律重试
        const waitSec = Math.min(30, 3 * Math.pow(2, Math.min(attempt - 1, 3))) // 3/6/12/24s, 上限 30s
        ep._status = control.timedOut ? '检测到无响应，自动重连续传…' : `网络较慢，自动续传中…（第 ${attempt} 次）`
        console.warn('[上传] 第 ' + attempt + ' 次中断, ' + waitSec + 's 后自动续传重试:', (upErr && upErr.message) || upErr)
        // 用当前已传分片构造续传信息 → 下次尝试从断点接着传(已传分片不丢)
        if (control.uploadId) {
          saveResume({ size: fileSize, cloudPath, uploadId: control.uploadId, partNumbers: control.partNumbers || [], partSize: control.partSize || PART_SIZE_BYTES, ts: Date.now() })
          attemptResume = { uploadId: control.uploadId, skipPartNumbers: (control.partNumbers || []).slice() }
        }
        await new Promise((r) => setTimeout(r, waitSec * 1000))
        // 退避期间用户取消/让位/急停 → 停止重试
        if (control.userCancelled || control.yieldPause || ep._uploadGen !== myGen) throw upErr
        // 复位本轮控制标记(保留 paused 以尊重暂停), 准备重连
        control.cancelled = false
        control.timedOut = false
        if (control.abortFns) control.abortFns.clear()
        lastActivityTs = Date.now()
      }
    }
    const fileID = upRes.fileID || (upRes.file && upRes.file.fileID)
    if (!fileID) throw new Error('上传失败')
    if (ep._uploadGen !== myGen) return // 任务已被取消/急停: 不再写回结果
    console.log('[上传] gen=' + myGen + ' 分片合并完成')
    const url = fileID.replace(/^cloud:\/\/[^/]+\//, 'https://636c-cloud1-d8gs2k9m311f7272f-1464523137.tcb.qcloud.la/')
    // 稳健写回: 优先按 _key 命中当前弹窗活对象, 否则按原对象引用(索引), 弹窗重建/课时重排也不丢视频 (2026-09-02 修复)
    const liveEp = (courseForm.value.episodes || []).find((e) => ep._key && e._key === ep._key)
      || (courseForm.value.episodes || [])[courseForm.value.episodes.indexOf(ep)]
      || ep
    liveEp.video = url
    if (!liveEp.title) liveEp.title = `第${(courseForm.value.episodes || []).indexOf(liveEp) + 1}集`
    ep.video = url
    if (!ep.title) ep.title = liveEp.title
    ep._uploading = false
    ep._paused = false
    ep._progress = 100
    ep._status = ''
    removeResume(fileSize) // 成功清除续传点
    uni.showToast({ title: '已上传', icon: 'success' })
    removeNetListeners()
    // 后台精准落库 (v1.11.310): 按开始时捕获的 (course_id + episode_index) 只更新该课时,
    // 即使用户传完前已切走课程、内存表单对象失效, 视频也不会丢
    if (myCourseId) {
      adminCourseEpisodeUpdate({ course_id: myCourseId, episode_index: myEpIndex, video: url })
        .then(() => {
          console.log('[上传] 课时已落库 course=' + myCourseId + ' ep=' + myEpIndex)
          clearCourseCache(myCourseId) // 清前台课程缓存, 避免刚传完的视频在前台看不到
        })
        .catch((e2) => console.warn('[上传] 课时落库失败(已写入表单, 需点保存):', (e2 && e2.message) || e2))
    }
    // C/OSS 提示改为【不阻塞上传队列】(2026-08-30 修复: 之前 await 会先查设置再弹窗等用户,
    // 期间 finally/dequeueNext 不执行 → 排队的下一个视频永远不自动开始)
    setTimeout(() => {
      maybeMigrateToOss({ course_id: myCourseId, episode_index: myEpIndex, video: ep.video, course_title: myCourseTitle, episode_title: ep.title || ('第' + (myEpIndex + 1) + '集') }).catch(() => {})
    }, 1200)
  } catch (e) {
    removeNetListeners()
    const msg = (e && e.message) || ''
    // 合并失败/未找到分片 → 旧 uploadId 已失效, 清除续传点, 下次从头传 (2026-08-30)
    if (msg.indexOf('未找到已上传的分片') >= 0 || msg.indexOf('合并') >= 0) {
      removeResume(fileSize)
    }
    // 失败/取消: 保存续传点 (分片保留在 COS, 下次选同文件可继续)
    if (control.uploadId) {
      saveResume({ size: fileSize, cloudPath, uploadId: control.uploadId, partNumbers: control.partNumbers || [], partSize: control.partSize || PART_SIZE_BYTES, ts: Date.now() })
    }
    ep._uploading = false
    if (ep._pausedYield) {
      // 暂停让位: 保留进度与"已暂停"态, 不显示"已取消"; UI 回到上传按钮(重新选文件可续传)
      ep._paused = true
      ep._status = '已暂停（点继续可续传）'
      ep._pausedYield = false
    } else {
      ep._paused = false
      ep._progress = 0
      ep._status = ''
    }
    if (e && e.code === 'UPLOAD_CANCELLED') {
      // pausedYield 让位: 显示"已暂停, 队列继续"; 普通取消: 显示"已取消(进度已保留)"
      uni.showToast({ title: ep._paused ? '已暂停，队列继续下一个' : '已取消(进度已保留)', icon: 'none' })
    } else if (msg.indexOf('初始化') >= 0) {
      uni.showToast({ title: msg, icon: 'none' }) // 初始化失败: 显示具体原因(网络/代理)
    } else if (msg.indexOf('未找到已上传的分片') >= 0) {
      uni.showToast({ title: '上传记录已失效，已重置，请重新上传', icon: 'none' })
    } else {
      // 显示真实失败原因(截断), 便于定位问题
      uni.showToast({ title: '上传中断：' + (msg.slice(0, 30) || '未知原因'), icon: 'none' })
      console.error('[上传失败]', e)
    }
  } finally {
    if (control.watchdog) clearInterval(control.watchdog) // 清理看门狗, 防定时器泄漏
    // 无论成功/失败/取消: 释放上传锁, 自动开始队列中的下一个
    if (currentUploadingEp === ep) currentUploadingEp = null
    dequeueNext()
  }
}
/* 暂停/继续 上传 (中断所有进行中的分片, 立即暂停; 恢复后自动续传)
   队列友好: 若还有其他课时在排队等待, 暂停当前会阻塞队列(单并发上传通道) —
   此时改为"让位": 中止当前上传(SDK 因 cancelled 结束), 保留续传进度, 释放上传锁,
   由 startUpload 的 finally 自动 dequeueNext 让队列下一个开始 (修复: 暂停后整个队列停摆) */
function togglePauseEpisodeUpload(ep) {
  if (!ep || !ep._control || !ep._uploading) return
  console.log('[上传控制] 点击暂停/继续, 当前 paused=', ep._paused, 'abortFns=', ep._control.abortFns ? ep._control.abortFns.size : 0, '排队数=', uploadQueue.value.length)
  if (ep._paused) {
    // 继续: 仅当没有其他任务占用上传通道时才能直接 resume
    if (currentUploadingEp && currentUploadingEp !== ep) {
      uni.showToast({ title: '请先暂停当前正在上传的任务', icon: 'none' })
      return
    }
    ep._control.paused = false
    ep._paused = false
    ep._status = ''
    uni.showToast({ title: '继续上传', icon: 'none' })
  } else {
    if (uploadQueue.value.length > 0) {
      // 有排队任务: 让位给队列 — 中止当前(SDK 结束 uploadFile), 保留续传进度, finally 自动开始下一个
      ep._pausedYield = true
      ep._control.cancelled = true
      ep._control.yieldPause = true // 标记"暂停让位" → 重试循环不再重试, 由 finally 出队下一个
      abortAllParts(ep._control)
      uni.showToast({ title: '已暂停，队列继续下一个（可点继续续传）', icon: 'none' })
    } else {
      // 无排队: 真暂停(SDK 内部暂停), 进度保留, 稍后点继续可 resume
      ep._control.paused = true
      ep._paused = true
      ep._status = '已暂停'
      abortAllParts(ep._control)
      uni.showToast({ title: '已暂停', icon: 'none' })
    }
  }
}
/* 继续已暂停(让位)的上传: 用保留的文件引用 + 续传记录, 无需重新选文件 (v1.11.308)
   - 通道空闲: 立即 startUpload, 内部 findResume(fileSize) 自动续传同一 uploadId
   - 通道被占用(其他课时在传): 入队, 轮到自动续传
   - 文件引用丢失(如刷新页面): 回退到重新选文件 */
function resumePausedUpload(ep) {
  if (!ep) return
  if (ep._uploading) return uni.showToast({ title: '该课时正在上传中', icon: 'none' })
  if (ep._queued) return uni.showToast({ title: '该课时正在排队等待中', icon: 'none' })
  const filePath = ep._filePath
  const fileObj = ep._fileObj
  const fileSize = ep._fileSize || 0
  if (!filePath && !fileObj) {
    // 文件引用已丢失(多为刷新页面) → 只能重新选文件
    return uploadEpisodeVideo(ep)
  }
  if (currentUploadingEp && currentUploadingEp !== ep) {
    // 通道被占用 → 入队, 轮到自动续传
    uploadQueue.value.push({ ep, filePath, fileSize, fileObj })
    ep._queued = true
    ep._paused = false
    ep._status = '等待上传'
    ep._progress = ep._progress || 0
    uni.showToast({ title: '已加入队列，轮到后自动续传', icon: 'none' })
    return
  }
  ep._paused = false
  ep._uploading = true
  ep._status = ''
  uni.showToast({ title: '继续上传', icon: 'none' })
  startUpload(ep, filePath, fileSize, fileObj)
}
/* 取消上传 (v1.11.264): **点击立即强制复位 UI**, 不依赖底层请求是否中断 —
   cancelled + abort 全部请求, 界面立刻恢复"上传"按钮, 保留续传进度;
   旧任务副作用由 gen 隔离 (startUpload 内检查 ep._uploadGen) 防止污染新任务 */
function cancelEpisodeUpload(ep) {
  if (!ep) return
  console.log('[上传控制] 点击取消', ep.title || ep._key, 'gen=', ep._uploadGen)
  if (ep._control) {
    ep._control.cancelled = true
    ep._control.userCancelled = true // 标记"用户主动取消" → startUpload 重试循环不再重试
    abortAllParts(ep._control) // 立即中断所有并发分片
    try {
      if (ep._control.uploadId && ep._fileSize) {
        saveResume({ size: ep._fileSize, cloudPath: ep._control.cloudPath || '', uploadId: ep._control.uploadId, partNumbers: ep._control.partNumbers || [], ts: Date.now() })
      }
    } catch (e) {}
    ep._control = null
  }
  // 立即强制复位 UI (同步执行, 无论底层死活)
  ep._uploading = false
  ep._paused = false
  ep._progress = 0
  ep._status = ''
  uploadGenCounter++ // 旧任务后续写入全部失效
  ep._uploadGen = -1
  // v1.11.309 修复: 取消"正在上传"的任务时, 旧代码不释放 currentUploadingEp,
  // 残留引用让 dequeueNext 判定通道仍被占用 → 后面排队的永远不出队(队列停摆)
  if (currentUploadingEp === ep) currentUploadingEp = null
  // 若该课时还在排队中 → 从队列移除, 否则取消后仍会被出队上传
  uploadQueue.value = uploadQueue.value.filter((q) => {
    if (!q || !q.ep) return true
    if (q.ep === ep) return false // 同一对象
    if (ep._key && q.ep._key === ep._key) return false // _key 匹配
    return true
  })
  ep._queued = false
  uni.showToast({ title: '已取消(进度已保留)', icon: 'none' })
  // 通道已释放且队列还有待传项 → 触发出队(与 startUpload 的 finally 双保险, _dequeueRunning 防重入)
  if (uploadQueue.value.length > 0 && !currentUploadingEp) setTimeout(() => dequeueNext(), 0)
  // 释放上传锁并开始队列中的下一个
  if (currentUploadingEp === ep) {
    currentUploadingEp = null
    dequeueNext()
  }
}
/* 遍历中断 control 中所有在传分片的请求 */
function abortAllParts(control) {
  if (!control || !control.abortFns || !control.abortFns.size) return
  control.abortFns.forEach((fn) => { try { fn() } catch (e) {} })
}

/* 从视频 URL 取文件名(便于弹窗标明是哪个文件) */
function ossFileNameOf(videoUrl) {
  if (!videoUrl) return ''
  try {
    const u = new URL(videoUrl)
    const parts = u.pathname.split('/')
    return decodeURIComponent(parts[parts.length - 1] || '')
  } catch (e) {
    const parts = String(videoUrl).split('?')[0].split('/')
    return parts[parts.length - 1] || ''
  }
}

/* ===== 上传完成后 C/OSS 存储确认弹窗 (2026-09-02 用户需求) =====
   询问「存储到 C/OSS / 存储本地」, 5 秒未选择 → 默认「存储本地」(不搬运), 不打断上传流程。
   同样因 uni.showModal 文案静态且无法程序化关闭, 用自定义弹窗实现倒计时。 */
const ossMigrateConfirm = ref(null) // { label, fname, left } | null
let ossMigrateResolve = null
let ossMigrateTimer = null
const OSS_MIGRATE_AUTO_SEC = 5 // 倒计时秒数, 到 0 默认存储本地

function closeOssMigrateConfirm(choice) {
  if (ossMigrateTimer) { clearInterval(ossMigrateTimer); ossMigrateTimer = null }
  ossMigrateConfirm.value = null
  const r = ossMigrateResolve
  ossMigrateResolve = null
  if (r) r(choice === true) // true=存储到 C/OSS, false=存储本地
}

function askOssMigrateConfirm(label, fname) {
  return new Promise((resolve) => {
    if (ossMigrateTimer) { clearInterval(ossMigrateTimer); ossMigrateTimer = null } // 兜底防重入
    ossMigrateResolve = resolve
    let left = OSS_MIGRATE_AUTO_SEC
    ossMigrateConfirm.value = { label, fname, left }
    ossMigrateTimer = setInterval(() => {
      left -= 1
      if (left <= 0) {
        closeOssMigrateConfirm(false) // 超时未选择 → 默认存储本地(不搬运)
        uni.showToast({ title: '已默认存储本地', icon: 'none' })
        return
      }
      ossMigrateConfirm.value = { label, fname, left }
    }, 1000)
  })
}

/* C/OSS 启用时: 询问是否将刚上传的本地视频搬运到 C/OSS */
async function maybeMigrateToOss(v) {
  let ossEnabledFlag = false
  try {
    const res = await adminSettingsGet({ group: 'oss' })
    const cfg = res.configs || {}
    ossEnabledFlag = cfg.enabled === '1' || cfg.enabled === true
  } catch (e) { /* 忽略, 默认不提示 */ }
  if (!ossEnabledFlag) return
  const label = [v.course_title, v.episode_title].filter(Boolean).join(' · ')
  const fname = ossFileNameOf(v.video)
  // 5s 未选择 → 默认「存储本地」(v1.11.312)
  const goOss = await askOssMigrateConfirm(label, fname)
  if (!goOss) return // 存储本地: 不做搬运
  try {
    uni.showLoading({ title: '搬运中...' })
    await adminVideoMigrate(v)
    uni.hideLoading()
    uni.showToast({ title: '已存储到 C/OSS', icon: 'success' })
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: e.message || '搬运失败', icon: 'none' })
  }
}

function openProductForm(p) {
  const attrsList = p && p.attrs
    ? Object.keys(p.attrs).map((k) => ({ key: k, value: String(p.attrs[k]) }))
    : []
  productForm.value = p
    ? { ...p, imagesText: (p.images || []).join(','), attrsList }
    : { id: null, name: '', price: '0.00', ot_price: '', stock: 0, cate_id: productActiveCate.value || 1, description: '', imagesText: '', attrsList }
  showProduct.value = true
}

function addAttrRow() {
  if (!productForm.value.attrsList) productForm.value.attrsList = []
  productForm.value.attrsList.push({ key: '', value: '' })
}

function removeAttrRow(i) {
  productForm.value.attrsList.splice(i, 1)
}

async function saveProduct() {
  const payload = {
    ...productForm.value,
    images: productForm.value.imagesText ? productForm.value.imagesText.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
  }
  delete payload.imagesText
  // attrsList → attrs 对象 (过滤空行)
  const attrs = {}
  ;(payload.attrsList || []).forEach((a) => {
    if (a.key && a.value) attrs[a.key] = a.value
  })
  payload.attrs = attrs
  delete payload.attrsList
  try {
    if (payload.id) await adminProductUpdate(payload)
    else await adminProductCreate(payload)
    showProduct.value = false
    uni.showToast({ title: '保存成功', icon: 'success' })
    await loadProductCates()
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  }
}

async function toggleProduct(p) {
  await adminProductUpdate({ id: p.id, is_show: p.is_show === false })
  await loadProductCates()
}

/* 商品/课程: 切换"首页推荐"标记 (home_recommend) */
async function toggleProductHome(p) {
  const val = p.home_recommend === true ? false : true
  await adminProductUpdate({ id: p.id, home_recommend: val })
  const g = { ...productGrouped.value }
  Object.keys(g).forEach((k) => {
    g[k] = g[k].map((x) => (x.id === p.id ? { ...x, home_recommend: val } : x))
  })
  productGrouped.value = g
  uni.showToast({ title: val ? '已推荐到首页' : '已取消推荐', icon: 'success' })
}

async function toggleCourseHome(c) {
  const val = c.home_recommend === true ? false : true
  await adminCourseUpdate({ id: c.id, home_recommend: val })
  const g = { ...courseGrouped.value }
  Object.keys(g).forEach((k) => {
    g[k] = g[k].map((x) => (x.id === c.id ? { ...x, home_recommend: val } : x))
  })
  courseGrouped.value = g
  uni.showToast({ title: val ? '已推荐到首页' : '已取消推荐', icon: 'success' })
}

async function toggleCourse(c) {
  const off = c.status === false || c.status === 'off'
  // 当前下架→点上架(设true); 当前上架→点下架(设false)
  await adminCourseUpdate({ id: c.id, status: off ? true : false })
  // 本地立即更新 (响应式, 不依赖重新请求)
  const newStatus = off ? true : false
  const g = { ...courseGrouped.value }
  Object.keys(g).forEach((k) => {
    g[k] = g[k].map((x) => (x.id === c.id ? { ...x, status: newStatus } : x))
  })
  courseGrouped.value = g
  uni.showToast({ title: off ? '已上架' : '已下架', icon: 'success' })
}

async function deleteProduct(p) {
  uni.showModal({
    title: '提示',
    content: `确定删除商品「${p.name}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        await adminProductDelete({ id: p.id })
        uni.showToast({ title: '已删除', icon: 'none' })
        await loadProductCates()
      }
    },
  })
}

/* 课程 */
const showCourse = ref(false)
const courseForm = ref({})

function openCourseForm(c) {
  // 切换课程清理 (2026-08-30): 若当前上传/排队的任务属于其他课程, 中止并保留进度, 防止"幽灵上传"残留
  const newCid = c ? c.id : null
  // 同一课程且仍有上传/排队任务 → 保留内存表单(含未保存视频与上传状态), 不重建 episodes,
  // 否则队列里 ep 引用会脱离新数组, 前面排队的视频写回失效(只生效最后两个) (2026-09-02 修复)
  if (newCid != null && courseForm.value.id === newCid && ((currentUploadingEp && currentUploadingCourseId === newCid) || uploadQueue.value.length > 0)) {
    showCourse.value = true
    return
  }
  // v1.11.310: 切换课程【不再中止】在传任务 —— 用户要求"不能中断、不退随意退出"。
  // 上传继续在后台跑, 成功后由 startUpload 按 (course_id + episode_index) 调
  // admin.course.episode.update 精准落库, 因此切课也不会丢视频。
  // 旧逻辑在此直接 cancel 正在传的任务 → 用户切个课程上传就没了(典型的"随意退出")。
  if (currentUploadingEp && currentUploadingCourseId !== newCid) {
    console.log('[上传] 切换课程, 上传任务在后台继续(不中断):', currentUploadingEp.title || currentUploadingEp._key)
    uni.showToast({ title: '上传在后台继续，完成后自动写入该课时', icon: 'none' })
  }
  if (uploadQueue.value.length) {
    uploadQueue.value.forEach((q) => { if (q && q.ep) { q.ep._queued = false; q.ep._status = '' } })
    uploadQueue.value = []
  }
  courseForm.value = c
    ? { ...c, episodes: Array.isArray(c.episodes) ? c.episodes.map((e) => ({ ...e, _key: e._key || epKey() })) : (c.video ? [{ _key: epKey(), title: '第1集', video: c.video }] : []) }
    : { id: null, title: '', teacher: '', price: '0.00', ot_price: '', cover: '', category_id: courseActiveCate.value || 1, lessons_count: 0, level: '入门', description: '', episodes: [] }
  showCourse.value = true
}

async function saveCourse() {
  try {
    if (courseForm.value.id) await adminCourseUpdate(courseForm.value)
    else await adminCourseCreate(courseForm.value)
    showCourse.value = false
    uni.showToast({ title: '保存成功', icon: 'success' })
    await loadCourseCates()
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  }
}

/* ---- 分类管理 ---- */
const showCate = ref(false)
const cateForm = ref({})

function openCateForm(type, c) {
  cateForm.value = c
    ? { type, id: c.id, name: c.name, description: c.description || '', is_show: c.is_show !== false }
    : { type, id: null, name: '', description: '', is_show: true }
  showCate.value = true
}

async function saveCate() {
  try {
    if (cateForm.value.id) {
      await adminCateUpdate({ type: cateForm.value.type, id: cateForm.value.id, name: cateForm.value.name, description: cateForm.value.description, is_show: cateForm.value.is_show })
    } else {
      await adminCateCreate({ type: cateForm.value.type, name: cateForm.value.name, description: cateForm.value.description, is_show: cateForm.value.is_show })
    }
    showCate.value = false
    uni.showToast({ title: '保存成功', icon: 'success' })
    if (cateForm.value.type === 'products') await loadProductCates()
    else await loadCourseCates()
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  }
}

async function moveCate(c, dir, type) {
  // 获取当前分类排序列表 (与前端显示一致: 按 sort)
  const list = type === 'products' ? productCates.value : courseCates.value
  const idx = list.findIndex((x) => x.id === c.id)
  if (idx < 0) return
  const target = idx + dir
  if (target < 0 || target >= list.length) return uni.showToast({ title: dir < 0 ? '已在最前' : '已在最后', icon: 'none' })
  const a = list[idx]
  const b = list[target]
  try {
    // 交换 sort
    await adminCateUpdate({ type, id: a.id, sort: b.sort || b.id })
    await adminCateUpdate({ type, id: b.id, sort: a.sort || a.id })
    uni.showToast({ title: '已调整顺序', icon: 'none' })
    if (type === 'products') await loadProductCates()
    else await loadCourseCates()
  } catch (e) {
    uni.showToast({ title: '调整失败: ' + (e.message || ''), icon: 'none' })
  }
}

function toggleCateShow(c, type) {
  uni.showModal({
    title: '前端显示',
    content: c.is_show === false ? `确定在用户端显示「${c.name}」分类吗？` : `确定隐藏「${c.name}」分类吗？用户端将不再显示该分类下的商品/课程入口。`,
    success: async (res) => {
      if (!res.confirm) return
      await adminCateUpdate({ type, id: c.id, is_show: c.is_show === false })
      if (type === 'products') await loadProductCates()
      else await loadCourseCates()
    },
  })
}

function deleteCate(c, type) {
  uni.showModal({
    title: '删除分类',
    content: `确定删除分类「${c.name}」吗？该分类下的商品/课程不会被删除，但将无法归入此分类。`,
    success: async (res) => {
      if (!res.confirm) return
      await adminCateDelete({ type, id: c.id })
      uni.showToast({ title: '已删除', icon: 'none' })
      if (type === 'products') await loadProductCates()
      else await loadCourseCates()
    },
  })
}

/* 订单 */
async function payForOrder(o) {
  await adminOrderShip({ order_no: o.order_no })
  uni.showToast({ title: '已收款', icon: 'success' })
  await loadOrders()
}

/* 发货: 跳转物流选择页 */
function openShip(o) {
  uni.navigateTo({ url: `/pages-sub/admin/logistics?order_no=${o.order_no}` })
}

async function shipOrder(o) {
  await adminOrderShip({ order_no: o.order_no })
  uni.showToast({ title: '已发货', icon: 'success' })
  await loadOrders()
}

async function deleteOrder(o) {
  uni.showModal({
    title: '删除订单',
    content: '确认删除订单 ' + o.order_no + ' 吗？删除后不可恢复！',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await adminOrderDelete({ order_no: o.order_no })
        uni.showToast({ title: '已删除', icon: 'success' })
        await loadOrders()
      } catch (e) {
        uni.showToast({ title: e.message || '删除失败', icon: 'none' })
      }
    },
  })
}

async function refundOrder(o) {
  uni.showModal({
    title: '退款',
    content: `确认对订单 ${o.order_no} 退款吗？`,
    success: async (res) => {
      if (res.confirm) {
        await adminOrderRefund({ order_no: o.order_no })
        uni.showToast({ title: '已退款', icon: 'success' })
        await loadOrders()
      }
    },
  })
}

/* 用户 */
function deleteUser(form) {
  const isAdminUser = form.role === 'admin'
  uni.showModal({
    title: '删除用户',
    content: isAdminUser
      ? '该账号是超级管理员，不可直接删除。可先将其降级为管理员/员工后再删除。'
      : '确定删除用户 ' + (form.nickname || form.dao_code || form.uid) + ' 吗？将同时清除其订单/收藏/足迹等数据，且该账号将无法再登录，不可恢复！',
    showCancel: !isAdminUser,
    confirmText: isAdminUser ? '知道了' : '删除',
    confirmColor: '#9c1630',
    success: (r) => {
      if (!r.confirm || isAdminUser) return
      uni.showModal({
        title: '再次确认',
        content: '删除后该账号将无法再登录，且不可恢复，请再次确认！',
        confirmColor: '#9c1630',
        success: async (r2) => {
          if (!r2.confirm) return
          try {
            await adminUserDelete({ uid: form.uid })
            uni.showToast({ title: '已删除', icon: 'success' })
            showAssignId.value = false
            await loadModule('users')
          } catch (e) {
            uni.showToast({ title: e.message || '删除失败', icon: 'none' })
          }
        },
      })
    },
  })
}

async function doCreateUser() {
  const phone = createForm.value.phone.trim()
  const nickname = createForm.value.nickname.trim()
  if (!/^1\d{10}$/.test(phone)) return uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
  if (!nickname) return uni.showToast({ title: '请输入昵称', icon: 'none' })
  try {
    const res = await adminUserCreate({
      phone,
      nickname,
      role: createForm.value.role,
      password: createForm.value.password || '123456',
    })
    uni.showToast({ title: '已创建：' + res.dao_code, icon: 'none' })
    showCreateUser.value = false
    createForm.value = { phone: '', nickname: '', password: '123456', role: 'staff' }
    await loadModule('users')
  } catch (e) {
    uni.showToast({ title: e.message || '创建失败', icon: 'none' })
  }
}

async function toggleAdmin(u) {
  // 员工→受限管理员(manager); 受限管理员→员工
  const role = u.role === 'staff' ? 'manager' : 'staff'
  await adminUserUpdate({ uid: u.uid, role })
  uni.showToast({ title: role === 'manager' ? '已设为管理员' : '已取消管理员', icon: 'none' })
  await loadModule('users')
}

/* 直播 */
const showLive = ref(false)
const liveForm = ref({})

function openLiveForm(l) {
  liveForm.value = l ? { ...l } : { id: null, title: '', anchor: '', start_time: '', status: 'upcoming', description: '', cover: '' }
  liveForm.value._coverUrl = (l && l._coverUrl) || ''
  showLive.value = true
}

async function saveLive() {
  try {
    if (liveForm.value.id) await adminLiveUpdate(liveForm.value)
    else await adminLiveCreate(liveForm.value)
    showLive.value = false
    uni.showToast({ title: '保存成功', icon: 'success' })
    await loadModule('lives')
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  }
}

/* 动态 */
async function deleteMoment(m) {
  uni.showModal({
    title: '删除动态',
    content: '确定删除该条动态吗？其评论也会一并删除',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await adminMomentDelete({ id: m.id, _id: m._id })
        uni.showToast({ title: '已删除', icon: 'none' })
        await loadModule('moments')
      } catch (e) {
        uni.showToast({ title: '删除失败: ' + (e.message || ''), icon: 'none' })
      }
    },
  })
}

async function auditMoment(m) {
  await adminMomentAudit({ id: m.id, _id: m._id, is_recommended: !m.is_recommended })
  uni.showToast({ title: m.is_recommended ? '已取消精选' : '已精选', icon: 'none' })
  await loadModule('moments')
}

/* 优惠券 */
const showCoupon = ref(false)
const couponForm = ref({})

function openCouponForm(c) {
  couponForm.value = c ? { ...c } : { id: null, name: '', discount: '', expire_at: '2026-12-31' }
  showCoupon.value = true
}

async function saveCoupon() {
  try {
    if (couponForm.value.id) await adminCouponUpdate(couponForm.value)
    else await adminCouponCreate(couponForm.value)
    showCoupon.value = false
    uni.showToast({ title: '保存成功', icon: 'success' })
    await loadModule('coupons')
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  }
}

async function deleteCoupon(c) {
  uni.showModal({
    title: '提示',
    content: `确定删除优惠券「${c.name}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        await adminCouponDelete({ id: c.id })
        uni.showToast({ title: '已删除', icon: 'none' })
        await loadModule('coupons')
      }
    },
  })
}

/* ===== 系统设置 ===== */

const settingsTabs = [
  {
    group: 'sms', label: '短信配置', desc: '验证码短信发送方案：腾讯云短信直连（验证码入库自管，5 分钟有效）',
    fields: [
      { key: 'provider', label: '方案', type: 'select', options: ['tencent'], placeholder: 'tencent=腾讯云短信直连' },
      { key: 'secret_id', label: 'SecretId', secret: true },
      { key: 'secret_key', label: 'SecretKey', secret: true },
      { key: 'sms_sdk_app_id', label: '短信应用ID', placeholder: '140 开头' },
      { key: 'sign', label: '短信签名', placeholder: '如: 真和盛' },
      { key: 'template_id', label: '验证码模板ID' },
      { key: 'region', label: '区域', placeholder: 'ap-guangzhou' },
    ],
  },
  {
    group: 'oss', label: 'C/OSS 存储', desc: '对象存储，用于图片/文件上传；开启后可管理课程视频本地/C/OSS 存储',
    fields: [
      { key: 'enabled', label: '启用 C/OSS 存储', type: 'switch', desc: '开启后上传视频时可选择存储到 C/OSS，并可搬运本地视频' },
      { key: 'provider', label: '服务商', type: 'select', options: [{ label: '腾讯云COS', value: 'cos' }, { label: '阿里云OSS', value: 'oss' }], placeholder: '选择对象存储服务商' },
      { key: 'access_key', label: 'AccessKeyId', secret: true },
      { key: 'secret_key', label: 'AccessKeySecret', secret: true },
      { key: 'bucket', label: 'Bucket 名称' },
      { key: 'region', label: 'Region', placeholder: 'ap-shanghai' },
      { key: 'domain', label: 'CDN 域名' },
    ],
  },
  {
    group: 'mp', label: '公众号', desc: '微信公众号（服务号/订阅号）',
    fields: [
      { key: 'app_id', label: 'AppID' },
      { key: 'app_secret', label: 'AppSecret', secret: true },
      { key: 'token', label: 'Token', secret: true },
      { key: 'encoding_aes_key', label: '消息加密 Key', secret: true },
    ],
  },
  {
    group: 'miniapp', label: '小程序', desc: '微信小程序',
    fields: [
      { key: 'app_id', label: 'AppID' },
      { key: 'app_secret', label: 'AppSecret', secret: true },
      { key: 'env_id', label: '云开发环境 ID', placeholder: 'zhenhesheng-xxxxxx' },
    ],
  },
  {
    group: 'wxmp', label: '小程序接管', desc: '微信第三方平台扫码授权（上传开发版 / 体验码 / 提审 / 发布）', fields: [],
  },
  {
    group: 'pay', label: '支付设置', desc: '结算支付方式展示开关',
    fields: [
      { key: 'show_alipay', label: '显示支付宝', type: 'switch', desc: '开启后结算页显示支付宝选项（默认隐藏）' },
      { key: 'show_balance', label: '显示元宝支付', type: 'switch', desc: '开启后结算页显示元宝抵扣（默认显示）' },
      { key: 'alipay_appid', label: '支付宝 AppID', secret: true, placeholder: '支付宝开放平台应用 APPID' },
      { key: 'alipay_private_key', label: '支付宝应用私钥', secret: true, placeholder: '应用私钥（PKCS8）' },
      { key: 'alipay_public_key', label: '支付宝公钥', secret: true, placeholder: '支付宝平台公钥（验签）' },
      { key: 'alipay_notify_host', label: '回调域名', placeholder: '如 cloud1-xxxx.ap-shanghai.app.tcloudbase.com' },
    ],
  },
  {
    group: 'live', label: '直播配置', desc: '直播推流与播放服务',
    fields: [
      { key: 'provider', label: '服务商', placeholder: '腾讯云直播 / 自有平台' },
      { key: 'app_id', label: 'AppId' },
      { key: 'push_url', label: '推流地址', secret: true },
      { key: 'pull_url', label: '拉流地址' },
      { key: 'license_url', label: 'License 地址', secret: true },
    ],
  },
  {
    /* 快递鸟物流查询 (2026-09-04 接入 v1.12.0): 发货时自动订阅轨迹, 轨迹变化由快递鸟回调同步 */
    group: 'logistics', label: '物流查询', desc: '快递鸟物流：在线下单取件（自动获取运单号）+ 轨迹回调同步，用户可在订单详情查看物流',
    fields: [
      { key: 'enabled', label: '启用快递鸟', type: 'switch', desc: '开启后发货自动订阅物流轨迹，并接收快递鸟回调' },
      { key: 'kdniao_ebusiness_id', label: '商户ID', placeholder: '快递鸟后台的 EBusinessID' },
      { key: 'kdniao_app_key', label: 'API Key', secret: true, placeholder: '快递鸟后台的 AppKey（用于签名）' },
      { key: 'kdniao_callback_url', label: '回调地址', placeholder: 'https://cloud1-xxx.ap-shanghai.app.tcloudbase.com/dy-api?action=kdniao.callback' },
      { key: 'pay_type', label: '运费支付', placeholder: '1=现付 2=到付 3=月结（默认3，需已签月结协议）' },
      { key: 'customer_name', label: '月结账号', placeholder: '快递公司月结客户号（顺丰/京东等必填）' },
      { key: 'customer_pwd', label: '月结密码', secret: true, placeholder: '月结卡号校验码，非必填（部分快递需要）' },
      { key: 'sender_name', label: '发件人姓名', placeholder: '店铺/仓库联系人' },
      { key: 'sender_tel', label: '发件人电话', placeholder: '手机号或固话' },
      { key: 'sender_company', label: '发件公司', placeholder: '选填，显示在面单上' },
      { key: 'sender_province', label: '发件省份', placeholder: '如：北京市' },
      { key: 'sender_city', label: '发件城市', placeholder: '如：北京市' },
      { key: 'sender_area', label: '发件区县', placeholder: '如：通州区' },
      { key: 'sender_address', label: '发件详细地址', placeholder: '街道门牌号' },
    ],
  },
]

const activeSettingsTab = ref(settingsTabs[0].group)
/* 敏感字段「小眼睛」明文/密文切换 (2026-09-02):
   key 用 "分组.字段名" —— 不同分组存在同名字段(如 sms 与 oss 都有 secret_key), 必须按分组隔离 */
const secretVisibleMap = reactive({})
const secretKeyOf = (f) => `${activeSettingsTab.value}.${f.key}`
const secretVisible = (f) => !!secretVisibleMap[secretKeyOf(f)]
function toggleSecretVisible(f) {
  const k = secretKeyOf(f)
  secretVisibleMap[k] = !secretVisibleMap[k]
}
const settingsForm = ref({})
const settingsSaving = ref(false)
const settingsLoaded = ref({})
const settingsOriginal = ref({})

/* ===== 多月结账号 (2026-09-04) =====
   accounts 是数组, 不走 settingsForm 的扁平字段循环, 单独维护并在保存时并入 configs */
const logisticsAccounts = ref([])
const showAccountForm = ref(false)
const acctPwdVisible = ref(false)
const ACCOUNT_SHIPPERS = [
  { code: '', name: '通用（不限快递公司）' },
  { code: 'SF', name: '顺丰速运' },
  { code: 'ZTO', name: '中通快递' },
  { code: 'YTO', name: '圆通速递' },
  { code: 'STO', name: '申通快递' },
  { code: 'YUNDA', name: '韵达快递' },
  { code: 'JT', name: '极兔速递' },
  { code: 'JD', name: '京东物流' },
  { code: 'EMS', name: '中国邮政 EMS' },
]
const PAY_TYPES = [
  { value: 3, label: '月结（默认）' },
  { value: 1, label: '现付' },
  { value: 2, label: '到付' },
]
const emptyAccount = () => ({
  id: '',
  label: '',
  shipper_code: '',
  customer_name: '',
  customer_pwd: '',
  pay_type: 3,
  enabled: 1,
  is_default: 0,
  sender: { name: '', tel: '', company: '', province: '', city: '', area: '', address: '' },
})
const accountForm = ref(emptyAccount())

const accountShipperIdx = computed(() => {
  const i = ACCOUNT_SHIPPERS.findIndex((s) => s.code === (accountForm.value.shipper_code || ''))
  return i < 0 ? 0 : i
})
const accountShipperName = computed(() => (ACCOUNT_SHIPPERS[accountShipperIdx.value] || {}).name || '请选择')
const accountPayIdx = computed(() => {
  const i = PAY_TYPES.findIndex((p) => p.value === Number(accountForm.value.pay_type || 3))
  return i < 0 ? 0 : i
})
const accountPayName = computed(() => (PAY_TYPES[accountPayIdx.value] || {}).label || '月结')
function onAccountShipperChange(e) {
  accountForm.value.shipper_code = (ACCOUNT_SHIPPERS[Number(e.detail.value)] || {}).code || ''
}
function onAccountPayChange(e) {
  accountForm.value.pay_type = (PAY_TYPES[Number(e.detail.value)] || {}).value || 3
}

const shipperName = (code) => (ACCOUNT_SHIPPERS.find((s) => s.code === (code || '')) || {}).name || '通用'
const isAccountOn = (a) => a.enabled === 1 || a.enabled === true || a.enabled === '1'
function accountWarehouse(a) {
  const s = (a && a.sender) || {}
  const w = [s.province, s.city, s.area].filter(Boolean).join('')
  return w || '用全局发件人'
}

function openAccountForm(idx) {
  if (idx === null || idx === undefined) {
    accountForm.value = emptyAccount()
    accountForm.value._idx = null
    if (!logisticsAccounts.value.length) accountForm.value.is_default = 1
  } else {
    const src = logisticsAccounts.value[idx]
    accountForm.value = JSON.parse(JSON.stringify(src))
    accountForm.value.sender = Object.assign(emptyAccount().sender, src.sender || {})
    accountForm.value._idx = idx
  }
  showAccountForm.value = true
}
function saveAccount() {
  const f = accountForm.value
  if (!f.label.trim()) return uni.showToast({ title: '请填写备注名', icon: 'none' })
  if (!f.customer_name.trim()) return uni.showToast({ title: '请填写月结账号', icon: 'none' })
  const rec = {
    id: f.id || 'a' + Date.now().toString(36),
    label: f.label.trim(),
    shipper_code: f.shipper_code || '',
    customer_name: f.customer_name.trim(),
    customer_pwd: f.customer_pwd || '',
    pay_type: Number(f.pay_type || 3),
    enabled: f.enabled === undefined ? 1 : f.enabled,
    is_default: f.is_default ? 1 : 0,
    sender: Object.assign(emptyAccount().sender, f.sender || {}),
  }
  if (rec.is_default) {
    logisticsAccounts.value.forEach((a) => { a.is_default = 0 })
  }
  const idx = f._idx
  if (idx === null || idx === undefined) logisticsAccounts.value.push(rec)
  else logisticsAccounts.value[idx] = rec
  showAccountForm.value = false
  uni.showToast({ title: '已保存，请点下方保存配置', icon: 'none' })
}
function removeAccount(idx) {
  uni.showModal({
    title: '删除账号',
    content: `确定删除「${logisticsAccounts.value[idx].label}」吗？`,
    success: (r) => {
      if (!r.confirm) return
      logisticsAccounts.value.splice(idx, 1)
    },
  })
}
function toggleAccount(a) {
  const on = isAccountOn(a)
  a.enabled = on ? 0 : 1
}
function setDefaultAccount(a) {
  logisticsAccounts.value.forEach((x) => { x.is_default = 0 })
  a.is_default = 1
}

const currentSettingsTab = computed(
  () => settingsTabs.find((t) => t.group === activeSettingsTab.value) || settingsTabs[0]
)

function hasSecret(key) {
  return !!(settingsOriginal.value[activeSettingsTab.value] || {})[key]
}

/* 设置表单 select: 兼容 string[] 与 { label, value }[] 两种 options */
function settingSelectLabel(f) {
  const val = settingsForm.value[f.key]
  const opts = f.options || []
  if (!val) return (opts[0] && (typeof opts[0] === 'object' ? opts[0].label : opts[0])) || '请选择'
  const hit = opts.find((o) => (typeof o === 'object' ? o.value : o) === val)
  return hit ? (typeof hit === 'object' ? hit.label : hit) : val
}
function onSelectSetting(f, e) {
  const opt = (f.options || [])[e.detail.value]
  settingsForm.value[f.key] = typeof opt === 'object' ? opt.value : opt
}

function switchSettingsTab(group) {
  activeSettingsTab.value = group
  loadSettings(group)
  if (group === 'oss') {
    // 稍后等设置加载完成; 无论是否启用 C/OSS, 都加载视频列表(关闭时仅含云开发COS 本地视频)
    setTimeout(() => {
      if (!ossEnabled.value) ossStorageFilter.value = 'local'
      loadOssVideos()
    }, 400)
  }
}

async function loadSettings(group) {
  try {
    const res = await adminSettingsGet({ group })
    const configs = res.configs || {}
    settingsOriginal.value[group] = configs
    // 敏感字段不回显明文, 仅标记已配置
    const form = {}
    currentSettingsTab.value.fields.forEach((f) => {
      const val = configs[f.key]
      form[f.key] = f.secret && val ? '' : val || ''
    })
    settingsForm.value = form
    // 月结账号是数组, 独立于扁平字段加载
    if (group === 'logistics') {
      logisticsAccounts.value = Array.isArray(configs.accounts) ? JSON.parse(JSON.stringify(configs.accounts)) : []
    }
    settingsLoaded.value = { ...settingsLoaded.value, [group]: true }
  } catch (e) {
    uni.showToast({ title: e.message || '加载配置失败', icon: 'none' })
  }
}

async function saveSettings() {
  settingsSaving.value = true
  try {
    const configs = {}
    const cur = currentSettingsTab.value
    cur.fields.forEach((f) => {
      // 敏感字段留空 = 不修改
      if (f.secret && !settingsForm.value[f.key]) return
      configs[f.key] = settingsForm.value[f.key] || ''
    })
    // 月结账号数组并入提交 (不并入则服务端会保留旧值, 导致删除不生效)
    if (cur.group === 'logistics') configs.accounts = logisticsAccounts.value
    await adminSettingsSave({ group: cur.group, configs })
    uni.showToast({ title: '配置已保存', icon: 'success' })
    await loadSettings(cur.group)
    // 保存 C/OSS 配置后刷新视频列表(无论是否启用, 关闭时仅含云开发COS 本地视频)
    if (cur.group === 'oss') {
      if (!ossEnabled.value) ossStorageFilter.value = 'local'
      loadOssVideos()
    }
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  } finally {
    settingsSaving.value = false
  }
}

function clearSettingsSecret(f) {
  settingsForm.value[f.key] = ''
}

/* 测试 C/OSS 配置是否正确: 调云函数做一次极小预签名 PUT+DELETE 探测, 直出腾讯云错误码 */
const ossTesting = ref(false)
const ossTestResult = ref(null)
async function testOssConfig() {
  ossTesting.value = true
  ossTestResult.value = null
  try {
    const res = await adminOssConfigTest({})
    // 云函数一律返回 ok({ ok, ... }); 用内部 ok 字段判断
    const d = (res && res.data) || res || {}
    if (d.ok === true) {
      ossTestResult.value = { ok: true, message: d.message || '配置正确' }
      uni.showToast({ title: '连接成功', icon: 'success' })
    } else {
      ossTestResult.value = { ok: false, error: d.error || '配置有误' }
      uni.showToast({ title: '配置有误，见下方说明', icon: 'none' })
    }
  } catch (e) {
    ossTestResult.value = { ok: false, error: (e && e.message) || '测试失败' }
  } finally {
    ossTesting.value = false
  }
}

/* ===== C/OSS 视频存储管理 ===== */
const ossEnabled = computed(() => settingsForm.value.enabled === '1' || settingsForm.value.enabled === true)
const ossVideoList = ref([])
const ossLoading = ref(false)
const ossVideosLocal = computed(() => ossVideoList.value.filter((v) => !v.inOss))
const ossVideosRemote = computed(() => ossVideoList.value.filter((v) => v.inOss))
/* 本地 / C/OSS 存储体积合计 (size_bytes 为 null 的跳过) */
const ossLocalBytes = computed(() => ossVideosLocal.value.reduce((s, v) => s + (Number(v.size_bytes) || 0), 0))
const ossRemoteBytes = computed(() => ossVideosRemote.value.reduce((s, v) => s + (Number(v.size_bytes) || 0), 0))
/* 筛选后(当前展示列表 ossVideoFiltered) 的本地/对象存储体积与计数 —— 右上角统计随筛选同步更新 */
const ossFilteredLocal = computed(() => ossVideoFiltered.value.filter((v) => !v.inOss))
const ossFilteredRemote = computed(() => ossVideoFiltered.value.filter((v) => v.inOss))
const ossFilteredLocalCount = computed(() => ossFilteredLocal.value.length)
const ossFilteredRemoteCount = computed(() => ossFilteredRemote.value.length)
const ossFilteredLocalBytes = computed(() => ossFilteredLocal.value.reduce((s, v) => s + (Number(v.size_bytes) || 0), 0))
const ossFilteredRemoteBytes = computed(() => ossFilteredRemote.value.reduce((s, v) => s + (Number(v.size_bytes) || 0), 0))
/* 服务商(cos/oss): 决定"对象存储"显示为 COS 还是 OSS, 以及搬运按钮/筛选文案 */
const ossProvider = ref('cos')
/* 列表筛选: 存储位置(全部/云开发COS=本地/腾讯COS=对象存储) + 课程(按 course_id) */
const ossStorageFilter = ref('all')
const ossCourseFilter = ref('all')
const ossCourseOpen = ref(false)
const ossStorageOpen = ref(false)
const ossVideoFiltered = computed(() => {
  let list = ossVideoList.value
  if (ossCourseFilter.value !== 'all') list = list.filter((v) => v.course_id === ossCourseFilter.value)
  if (ossStorageFilter.value === 'local') list = list.filter((v) => !v.inOss)
  else if (ossStorageFilter.value === 'remote') list = list.filter((v) => v.inOss)
  return list
})
/* 课程下拉选项: 从列表去重得到 课程ID→标题 */
const ossCourseOptions = computed(() => {
  const map = new Map()
  ossVideoList.value.forEach((v) => {
    if (v.course_id && !map.has(v.course_id)) map.set(v.course_id, v.course_title)
  })
  return Array.from(map, ([course_id, course_title]) => ({ course_id, course_title }))
})
const ossCourseLabel = computed(() => {
  if (ossCourseFilter.value === 'all') return '全部课程'
  const c = ossCourseOptions.value.find((x) => x.course_id === ossCourseFilter.value)
  return c ? c.course_title : '全部课程'
})
/* 存储位置下拉当前显示名 (对象存储目标随服务商显示 腾讯COS / 阿里云OSS) */
const storageTargetLabel = computed(() => (ossProvider.value === 'oss' ? '阿里云OSS' : '腾讯COS'))
const ossStorageLabel2 = computed(() => {
  if (ossStorageFilter.value === 'all') return '全部位置'
  if (ossStorageFilter.value === 'local') return '云开发COS'
  return storageTargetLabel.value
})
function selectOssCourse(id) {
  ossCourseFilter.value = id
  ossCourseOpen.value = false
}
function selectOssStorage(val) {
  ossStorageFilter.value = val
  ossStorageOpen.value = false
}
/* 表头筛选下拉: 用 fixed 定位弹出面板, 避免被 .table 的 overflow:auto 裁剪 (绝对定位会被裁) */
const coursePanelStyle = ref({})
const storagePanelStyle = ref({})
function placeOssFilterPanel(id) {
  return new Promise((resolve) => {
    uni.createSelectorQuery().select('#' + id).boundingClientRect((r) => {
      if (!r) return resolve({})
      let top = r.bottom + 6
      const estH = 340
      try {
        const wh = uni.getSystemInfoSync().windowHeight || 800
        if (top + estH > wh) top = Math.max(6, r.top - estH - 6)
      } catch (e) {}
      resolve({ position: 'fixed', top: top + 'px', left: r.left + 'px', minWidth: r.width + 'px', maxWidth: '82vw' })
    }).exec()
  })
}
async function toggleOssCourseFilter() {
  if (ossCourseOpen.value) { ossCourseOpen.value = false; return }
  ossStorageOpen.value = false
  coursePanelStyle.value = await placeOssFilterPanel('ossCourseSel')
  ossCourseOpen.value = true
}
async function toggleOssStorageFilter() {
  if (ossStorageOpen.value) { ossStorageOpen.value = false; return }
  ossCourseOpen.value = false
  storagePanelStyle.value = await placeOssFilterPanel('ossStorageSel')
  ossStorageOpen.value = true
}
function closeOssFilters() { ossCourseOpen.value = false; ossStorageOpen.value = false }
/* 对象存储显示名: 根据服务商返回 COS / OSS */
function ossStorageLabel() {
  return ossProvider.value === 'oss' ? 'OSS' : 'COS'
}

/* 文件大小格式化: null/0 → "-"; B/KB/MB/GB 智能显示 */
function fmtFileSize(bytes) {
  const b = Number(bytes)
  if (!b || isNaN(b) || b <= 0) return '-'
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB'
  return (b / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}

/* 切换到 oss tab 或保存后自动加载视频列表 */
async function loadOssVideos() {
  ossLoading.value = true
  try {
    const res = await adminVideosList({})
    ossVideoList.value = Array.isArray(res.videos) ? res.videos : []
    ossProvider.value = (res.oss_provider || 'cos').toLowerCase()
  } catch (e) {
    uni.showToast({ title: e.message || '加载视频列表失败', icon: 'none' })
  } finally {
    ossLoading.value = false
  }
}

/* 搬运单个视频到 C/OSS (带行内进度条: 云端写字节级进度, 前端按 taskId 轮询展示)
   健壮性: 搬运是云端长连接任务, 网关空闲超时可能先掐断 HTTP 连接(报 request:fail),
   但云端仍在后台继续搬运 —— 因此请求断开后不立即判失败, 改为继续轮询 DB 进度,
   直到云端真正写入 phase='done'(搬完) 或进度冻结超时才判定结果 */
async function migrateOssVideo(v) {
  const taskId = `${v.course_id}_${v.episode_index}_${Date.now()}`
  // 行内进度标记 (ossVideoList 为 ref 深层响应, 修改子属性可触发更新)
  const item = ossVideoList.value.find((x) => x.course_id === v.course_id && x.episode_index === v.episode_index)
  if (item) {
    item._migrating = true
    item._migratePhase = 'transfer'
    item._migratePercent = 0
  }
  let done = false
  let errored = ''
  let lastUpdate = 0
  const refresh = async () => {
    try {
      const p = await adminVideoMigrateProgress({ taskId })
      if (!p) return
      if (item) {
        item._migratePercent = p.percent || 0
        item._migratePhase = p.phase || 'transfer'
      }
      if (p.phase === 'done' || p.percent >= 100) done = true
      // 云端已把真实错误落库(phase=error): 优先用其提示, 不再笼统报"超时"
      if (p.phase === 'error') errored = p.error || '搬运失败'
      if (p.updatedAt) lastUpdate = p.updatedAt
    } catch (e) {}
  }
  const timer = setInterval(refresh, 1000)
  try {
    await adminVideoMigrate({ course_id: v.course_id, episode_index: v.episode_index, taskId, video: v.video })
    done = true
  } catch (e) {
    const mMsg = (e && e.message) || ''
    // 明确业务失败(云函数返回 fail 消息, 非网络断开) → 直接提示并停止, 不进轮询傻等
    const isNetDrop = mMsg.indexOf('request:fail') >= 0 || mMsg.indexOf('timeout') >= 0 || mMsg.indexOf('网络') >= 0
    if (!isNetDrop) {
      if (item) { item._migrating = false; item._migratePercent = 0 }
      uni.showToast({ title: mMsg || '搬运失败', icon: 'none' })
      return
    }
    // 连接被网关空闲超时断开属预期: 云端仍在后台搬运(已把进度/错误写入 DB), 转由下方轮询等待完成
    console.warn('[migrate] 请求连接断开(后台继续搬运):', mMsg)
  }
  // 等待云端真正搬完 (函数最长 900s, 这里留 880s 余量)
  const deadline = Date.now() + 880000
  while (!done && !errored && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1000))
    await refresh()
    // 用 DB 写入时间(updatedAt)判卡死: 进度超 45s 未更新且未 done → 云端真卡死(慢速传输也会持续写进度, 不会误杀)
    if (!done && lastUpdate && Date.now() - lastUpdate > 45000) break
  }
  clearInterval(timer)
  if (done) {
    if (item) {
      item._migrating = false
      item._migratePercent = 100
    }
    uni.showToast({ title: `已搬运到 ${ossStorageLabel()}`, icon: 'success' })
    await loadOssVideos()
  } else {
    if (item) {
      item._migrating = false
      item._migratePercent = 0
    }
    uni.showToast({ title: errored || '搬运失败或超时，请重试', icon: 'none' })
  }
}

/* 删除单个视频 (本地 CloudBase 存储 或 C/OSS 对象存储) 并清空课时 video, 便于重新上传替换 */
function deleteOssVideo(v) {
  const storageLabel = v.inOss ? `${ossStorageLabel()} 对象存储` : '云开发COS'
  uni.showModal({
    title: '删除视频',
    content: `确认删除「${v.course_title} - ${v.episode_title}」的视频吗？\n存储位置：${storageLabel}\n删除后需重新上传替换。`,
    confirmText: '删除',
    confirmColor: '#e64340',
    success: async (r) => {
      if (!r.confirm) return
      try {
        uni.showLoading({ title: '删除中...' })
        await adminVideoDelete({ course_id: v.course_id, episode_index: v.episode_index })
        uni.hideLoading()
        uni.showToast({ title: '已删除', icon: 'success' })
        await loadOssVideos()
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.message || '删除失败', icon: 'none' })
      }
    },
  })
}

onMounted(async () => {
  // 仅 admin(超管)/manager(管理员,只读)/operator(操作管理员) 可访问后台; 员工(staff)/普通用户(user)拒绝
  if (!userStore.isLoggedIn || !['admin', 'manager', 'operator'].includes(userStore.userInfo.role)) {
    uni.redirectTo({ url: '/pages-sub/admin/login' })
    return
  }
  await loadModule('overview')
})
</script>

<style lang="scss" scoped>
.admin-dash {
  height: 100vh;
  display: flex;
  background: #fbe9ec;
  overflow: hidden;
}
/* u-popup 脱离 flex 占位 (H5 下 popup 根元素 static, 会挤占 main 宽度) */
.admin-dash :deep(.u-popup) {
  position: fixed;
  width: 0;
  height: 0;
  overflow: visible;
}

/* ===== 侧边栏 ===== */
.sidebar {
  width: 210rpx;
  height: 100vh;
  background: #9c1630;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.2s;
  position: relative;
}
.sidebar.collapsed {
  width: 96rpx;
}
.sidebar-collapse {
  position: absolute;
  right: -32rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 36rpx;
  height: 64rpx;
  background: #9c1630;
  border-radius: 0 12rpx 12rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b8860b;
  font-size: 26rpx;
  z-index: 5;
}
.logo-area {
  padding: 32rpx 12rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-bottom: 1rpx solid rgba(201, 169, 106, 0.2);
}
.sidebar.collapsed .logo-area { padding: 32rpx 12rpx 24rpx; }
.logo-seal {
  width: 72rpx;
  height: 72rpx;
  border: 2rpx solid #b8860b;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 106, 0.12);
  margin-bottom: 16rpx;
}
.logo-seal text {
  font-size: 40rpx;
  color: #b8860b;
}
.logo-name {
  font-size: 28rpx;
  color: #fffafa;
  letter-spacing: 4rpx;
}
.logo-sub {
  margin-top: 6rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.logo-sub-txt {
  font-size: 18rpx;
  color: rgba(240, 230, 205, 0.5);
  letter-spacing: 6rpx;
}
/* 版本号徽标 (2026-08-31: 从顶栏移到「管理后台」之后; 深色侧边栏用浅色胶囊; 点击看 commit/构建日期) */
.logo-ver {
  font-size: 16rpx;
  color: rgba(240, 230, 205, 0.72);
  background: rgba(255, 250, 250, 0.1);
  border: 1rpx solid rgba(201, 169, 106, 0.45);
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
  letter-spacing: 0;
  cursor: pointer;
}
.logo-ver:hover {
  color: #c9a96a;
  border-color: #c9a96a;
}

.menu-scroll {
  flex: 1;
  min-height: 0;
}
.menu-item {
  display: flex;
  align-items: center;
  padding: 22rpx 16rpx;
  margin: 4rpx 10rpx;
  border-radius: 10rpx;
}
.menu-item.active {
  background: rgba(201, 169, 106, 0.18);
}
.menu-item.active .menu-label {
  color: #b8860b;
  font-weight: 500;
}
.menu-icon {
  font-size: 30rpx;
  margin-right: 16rpx;
}
.menu-label {
  font-size: 26rpx;
  color: rgba(240, 230, 205, 0.65);
}

.sidebar-foot {
  padding: 20rpx;
  border-top: 1rpx solid rgba(201, 169, 106, 0.2);
}
.admin-user {
  display: flex;
  align-items: center;
  padding: 12rpx;
}
.au-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #b8860b;
  color: #9c1630;
  font-size: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14rpx;
}
.au-info {
  display: flex;
  flex-direction: column;
}
.au-name {
  font-size: 22rpx;
  color: #55524c;
}
.au-role {
  font-size: 18rpx;
  color: rgba(240, 230, 205, 0.5);
  margin-top: 4rpx;
}

/* ===== 主区 ===== */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 40rpx;
  background: #fffafa;
  border-bottom: 1rpx solid #e8e2da;
}
.tb-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #9c1630;
}
.tb-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.tb-actions {
  display: flex;
  gap: 32rpx;
}
.tb-link {
  font-size: 24rpx;
  color: #c41e3a;
  white-space: nowrap;
}
.tb-link.danger {
  color: #9c1630;
}

.content {
  flex: 1;
  min-height: 0;
  height: 0;
}
/* content-inner: 承担内边距 (scroll-view 的 padding 在部分环境失效, 移到内部 view 保证四边间距) */
.content-inner {
  padding: 30rpx 40rpx;
  min-height: 100%;
  box-sizing: border-box;
}
/* 概览区: 直接使用 content-inner 内边距, 右侧与屏幕保持间距 */
.overview {
  padding-right: 16rpx;
}
.module-head {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}
.module-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #9c1630;
}
.filter-pills {
  display: flex;
  margin-left: auto;
}
.pill {
  padding: 8rpx 24rpx;
  margin-left: 12rpx;
  border-radius: 999rpx;
  background: #e8e2da;
  font-size: 22rpx;
  color: #55524c;
  white-space: nowrap;
  flex-shrink: 0;
}
.pill.on {
  background: #c41e3a;
  color: #fffafa;
}

/* 概览 */
.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.stat-card {
  background: #fffafa;
  border-radius: 14rpx;
  border: 1rpx solid #e8e2da;
  padding: 22rpx 14rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2rpx 10rpx rgba(69, 26, 3, 0.04);
}
.stat-num {
  font-size: 36rpx;
  font-weight: 500;
  color: #c41e3a;
}
.stat-label {
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #55524c;
}

.recent-panel {
  margin-top: 30rpx;
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  overflow: hidden;
}
/* 最近订单: 手机/小程序窄屏可左右滑动 */
.recent-list {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.recent-list::-webkit-scrollbar { display: none; }
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 30rpx;
  border-bottom: 1rpx solid #e8e2da;
}
.panel-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2a2a2a;
}
.panel-count {
  font-size: 22rpx;
  font-weight: 400;
  color: #a08e7a;
}
.panel-more {
  font-size: 22rpx;
  color: #c41e3a;
}
.recent-row {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #e8e2da;
  gap: 20rpx;
  min-width: 900rpx;
}
.recent-row:last-child {
  border-bottom: none;
}
.rr-no {
  width: 240rpx;
  font-size: 20rpx;
  color: #55524c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}
.rr-items {
  flex: 1;
  font-size: 24rpx;
  color: #2a2a2a;
}
.rr-price {
  width: 110rpx;
  text-align: right;
  font-size: 24rpx;
  white-space: nowrap;
  flex-shrink: 0;
  color: #9c1630;
}
.rr-status {
  width: 100rpx;
  text-align: center;
  font-size: 22rpx;
  color: #c41e3a;
}
.rr-time {
  width: 150rpx;
  text-align: right;
  font-size: 20rpx;
  color: #8a857c;
  white-space: nowrap;
  flex-shrink: 0;
}
.recent-empty {
  text-align: center;
  color: #8a857c;
  font-size: 24rpx;
  padding: 40rpx;
}

/* 表格 */
.table {
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.tr {
  display: flex;
  align-items: center;
  padding: 18rpx 24rpx;
  border-bottom: 1rpx solid #e8e2da;
  /* 手机端表格超宽时横向滑动, 显示更规整 */
  min-width: 1200rpx;
}
.tr:last-child {
  border-bottom: none;
}
.tr.th {
  background: #fbe9ec;
}
.th .td {
  font-weight: 500;
  color: #9c1630;
  font-size: 24rpx;
  /* 表头列间竖线, 区分边界 */
  border-left: 1rpx solid rgba(201, 169, 106, 0.35);
}
.th .td:first-child {
  border-left: none;
}
.td {
  font-size: 24rpx;
  color: #2a2a2a;
  overflow: hidden;
  flex-shrink: 0;
}
.w-img { width: 76rpx; }
.w-name { flex: 2; padding: 0 10rpx; min-width: 200rpx; white-space: nowrap; overflow: hidden; }
.w-price { width: 140rpx; white-space: nowrap; overflow: hidden; }
.w-stock { width: 130rpx; text-align: center; }
.w-no { width: 320rpx; font-size: 20rpx; white-space: nowrap; overflow: hidden; }
.w-user { width: 160rpx; font-size: 20rpx; white-space: nowrap; padding: 0 6rpx; overflow: hidden; }

/* ===== 订单分析 ===== */
.analysis-section { margin-bottom: 32rpx; }
.analysis-sub-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #2a2a2a;
  margin-bottom: 20rpx;
  padding-left: 16rpx;
  border-left: 6rpx solid #c4753a;
}
/* 成交分布: 单数+金额 双饼图容器 (移动端纵向, PC横向) */
.analysis-pies {
  display: flex;
  flex-direction: column;
  gap: 0;
}
/* 成交分布汇总条 */
.analysis-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  background: #fdf6ea;
  border: 1rpx solid #f0e3c8;
  border-radius: 12rpx;
  padding: 18rpx 20rpx;
  margin: 0 0 20rpx;
}
.as-sum-item { font-size: 26rpx; color: #6b5a45; }
.as-sum-item .as-num { font-size: 32rpx; font-weight: 700; color: #2a2a2a; }
.as-sum-item .as-num.price { color: #c4753a; }
.as-sum-divider { width: 1rpx; height: 30rpx; background: #e8dcc4; }
.pie-wrap {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 12rpx;
  overflow-x: auto;
}
.pie-svg-box {
  flex-shrink: 0;
  width: 200rpx;
  height: 200rpx;
}
.pie-svg {
  width: 100%;
  height: 100%;
}
/* CSS 环形图 (conic-gradient): 小程序/H5 通用, 替代不兼容小程序的 <svg> */
.pie-ring {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
}
.pie-ring-hole {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 68%;
  height: 68%;
  border-radius: 50%;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.pie-svg-num { font-size: 14px; font-weight: 700; fill: #2a2a2a; }
.pie-svg-label { font-size: 7px; fill: #8a7e6e; }
.pie-empty {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  border: 4rpx dashed #ddd;
  color: #ccc; font-size: 24rpx;
}
.pie-legend { flex: 1; min-width: 300rpx; }
.legend-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 8rpx 0;
  white-space: nowrap;
}
.legend-dot { width: 18rpx; height: 18rpx; border-radius: 50%; flex-shrink: 0; }
.legend-label { font-size: 22rpx; color: #2a2a2a; min-width: 76rpx; overflow: hidden; text-overflow: ellipsis; }
.legend-count { font-size: 22rpx; color: #8a7e6e; }
.legend-amount { font-size: 22rpx; color: #c4753a; font-weight: 600; margin-left: auto; }
.w-rank { width: 80rpx; text-align: center; font-weight: 600; color: #8a7e6e; }
.rank-top { color: #c4753a; font-size: 28rpx; }
.w-rk-name { flex: 2; min-width: 0; white-space: nowrap; }
.w-rk-count { width: 120rpx; text-align: center; }
.w-rk-amount { width: 180rpx; text-align: right; color: #c4753a; font-weight: 600; }
.sort-th { color: #c4753a; font-weight: 600; }

/* 用户统计条 */
.user-stats {
  display: flex;
  gap: 20rpx;
  margin-bottom: 16rpx;
}
.us-item {
  flex: 1;
  background: #fdf6ea;
  border: 1rpx solid #f0e3c8;
  border-radius: 12rpx;
  padding: 14rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}
.us-num {
  font-size: 34rpx;
  font-weight: bold;
  color: #3a2a18;
}
.us-label {
  font-size: 22rpx;
  color: #8b7355;
}
/* 当前在线: 绿色强调 */
.us-online { background: #eef6ea; border-color: #d6e8cf; }
.us-online .us-num { color: #4e7f3a; }
.us-online .us-label { color: #4e7f3a; }
.online-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #56a834;
  box-shadow: 0 0 6rpx rgba(86, 168, 52, 0.8);
  flex-shrink: 0;
}
.nick-line { display: flex; align-items: center; gap: 8rpx; }
.users-row { min-width: 2320rpx; }
/* 用户表时间列: 加宽保证 "2026/8/19 11:12:46" 完整一行显示 */
.users-row .w-time { width: 300rpx; flex: none; white-space: nowrap; }
.w-remark { flex: 1.2; min-width: 240rpx; padding: 0 10rpx; font-size: 22rpx; color: #6b5a45; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cred-tag {
  display: inline-block;
  padding: 6rpx 14rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  max-width: 220rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cred-wx { background: #e8f5e9; color: #2e7d32; }
.cred-mail { background: #e3f2fd; color: #1565c0; }
.cred-phone { background: #f3e5f5; color: #6a1b9a; }
.cred-none { background: #f5f5f5; color: #9e9e9e; }
.w-avatar-cell { flex: none; width: 90rpx; display: flex; align-items: center; justify-content: center; }
.user-td-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; overflow: hidden; background: #e8e2da; }
.user-td-avatar-fallback { display: flex; align-items: center; justify-content: center; font-size: 26rpx; color: #c41e3a; }
.users-nick { flex: none; width: 200rpx; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.w-price { white-space: nowrap; }
.w-status { width: 170rpx; text-align: center; white-space: nowrap; overflow: hidden; }
.w-ops { width: 340rpx; display: flex; align-items: center; flex-wrap: nowrap; gap: 8rpx; overflow: hidden; }
.thumb {
  width: 60rpx;
  height: 60rpx;
  border-radius: 8rpx;
  background: #fbe9ec;
}
/* 反馈图片缩略图 */
.fb-imgs {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 10rpx;
}
.fb-thumb {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  background: #fbe9ec;
}
/* 操作列: 搬运/删除 按钮同一行, 不换行 */
.ops {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 10rpx;
}
.op {
  font-size: 20rpx;
  color: #c41e3a;
  padding: 4rpx 10rpx;
  white-space: nowrap;
  flex-shrink: 0;
}
/* 推荐/取消推荐: 固定宽度, 保证后面的"删除"不受文字长度影响而上下对齐 */
.op-fixed {
  width: 150rpx;
  text-align: center;
}
/* 订单操作: 固定 4 列, 未显示的操作用 visibility 占位, 同一操作各行动画对齐
   overflow: visible 防止"删除"按钮被裁切; 表格 .table 已有 overflow-x:auto 可横向滑动 */
.w-ops-4 {
  width: 470rpx;
  overflow: visible;
  padding-right: 12rpx;
}
.op-col {
  width: 108rpx;
  text-align: center;
}
.op-col.hide {
  visibility: hidden;
  pointer-events: none;
}
/* 订单分类统计条 (商品/课程/AI解盘/预约) */
.order-type-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin: 0 0 20rpx;
}
.order-type-stats .ots-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: #f6efe3;
  border: 1rpx solid #e8dcc4;
  border-radius: 10rpx;
  padding: 8rpx 16rpx;
}
.order-type-stats .ots-label { font-size: 22rpx; color: #c41e3a; font-weight: 600; }
.order-type-stats .ots-val { font-size: 22rpx; color: #6b5a45; }
.order-type-stats .ots-val .price { color: #c4753a; }

/* 订单表格: 列宽紧凑; 列数多时横向滑动, 表头随内容同滚 (.table overflow-x:auto 已保证) */
.orders-table .tr { min-width: 1560rpx; }
.orders-table .w-no { width: 240rpx; }
.orders-table .w-user { width: 120rpx; }
.orders-table .w-name { flex: 1 1 180rpx; min-width: 160rpx; max-width: 320rpx; }
.orders-table .w-price { width: 120rpx; }
.orders-table .w-time { width: 280rpx; }
.orders-table .w-status { width: 130rpx; }
.orders-table .w-ops-4 { width: 460rpx; }
/* 可排序表头 */
.orders-table .sortable { cursor: pointer; user-select: none; white-space: nowrap; }
.orders-table .sortable:active { color: #c4753a; }
.op.danger {
  color: #9c1630;
}
/* 首页推荐列 + 推荐高亮 */
.w-rec { width: 150rpx; display: flex; align-items: center; justify-content: center; }
.op.rec-on {
  color: #b07a2a;
  font-weight: 600;
}
.on { color: #6e7f5a; }
.off { color: #9c1630; }
.ls-live { color: #9c1630; }
.ls-upcoming { color: #c41e3a; }
.ls-ended { color: #55524c; }
.ellipsis {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 系统设置 */
.settings-tabs {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 24rpx;
}
.settings-tab {
  padding: 12rpx 32rpx;
  margin-right: 16rpx;
  margin-bottom: 12rpx;
  border-radius: 999rpx;
  background: #e8e2da;
  font-size: 26rpx;
  color: #55524c;
}
.settings-tab.on {
  background: #c41e3a;
  color: #fffafa;
  font-weight: 500;
}
.cover-preview {
  width: 140rpx;
  height: 90rpx;
  border-radius: 8rpx;
  border: 1rpx solid #e8e2da;
}
/* 盘道多封面缩略图 (可多张, 详情页左右滑动; 角标序号=轮播顺序, × 移除单张) */
.pd-cover-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 12rpx;
}
.pd-cover-cell {
  position: relative;
  width: 140rpx;
  height: 100rpx;
}
.pd-cover-thumb {
  width: 140rpx;
  height: 100rpx;
  border-radius: 8rpx;
  border: 1rpx solid #e8e2da;
  background: #f8f5f0;
}
.pd-cover-thumb.ph {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b8b0a4;
  font-size: 22rpx;
}
.pd-cover-idx {
  position: absolute;
  left: 4rpx;
  bottom: 4rpx;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 18rpx;
  padding: 0 8rpx;
  border-radius: 6rpx;
}
.pd-cover-del {
  position: absolute;
  right: -6rpx;
  top: -6rpx;
  width: 34rpx;
  height: 34rpx;
  line-height: 30rpx;
  text-align: center;
  border-radius: 50%;
  background: #c0392b;
  color: #fff;
  font-size: 24rpx;
}
/* 上传封面: 按钮+预览 同行 */
.f-row-inline {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.f-label-sm {
  font-size: 22rpx;
  color: #9c1630;
  white-space: nowrap;
}
/* 盘道场次列表封面缩略图 */
.home-pd-cover {
  width: 96rpx;
  height: 96rpx;
  border-radius: 10rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
  background: #f8f5f0;
}
.filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx;
  padding: 0 0 16rpx;
}
.filter-label {
  font-size: 24rpx;
  color: #55524c;
  margin-right: 6rpx;
}
.filter-pill {
  font-size: 22rpx;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: #f8f5f0;
  color: #55524c;
}
.filter-pill.on {
  background: #c41e3a;
  color: #fffafa;
}
.filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx;
  padding: 0 0 16rpx;
}
.filter-label {
  font-size: 24rpx;
  color: #55524c;
  margin-right: 6rpx;
}
.filter-pill {
  font-size: 22rpx;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: #f8f5f0;
  color: #55524c;
}
.filter-pill.on {
  background: #c41e3a;
  color: #fffafa;
}


.f-input.ph {
  color: #8a857c;
}
/* 表单只读文本(如自动同步的星期) */
.f-label-plain {
  font-size: 26rpx;
  color: #2a2a2a;
  line-height: 56rpx;
}
/* 页面管理 */
.home-pandao-list {
  margin-bottom: 20rpx;
}
.home-pd-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0e8d8;
}
.home-pd-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.home-pd-title {
  font-size: 26rpx;
  color: #3a2a18;
  font-weight: bold;
}
.home-pd-status {
  font-size: 20rpx;
  color: #27ae60;
  margin-left: 10rpx;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  background: #e8f5e9;
}
.home-pd-status.st-end {
  color: #95a5a6;
  background: #f0f0f0;
}
.home-pd-status.st-live {
  color: #c0392b;
  background: #fdecea;
}
.home-pd-meta {
  font-size: 22rpx;
  color: #8b7355;
}

.settings-card {
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  padding: 30rpx;
  /* 手机端设置表单横向滑动 */
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.settings-card .f-row {
  min-width: 680rpx;
  flex-shrink: 0;
}
.settings-card .f-label {
  flex-shrink: 0;
  width: 150rpx;
}
.settings-card .f-input-wrap {
  min-width: 0;
}
.settings-card .settings-actions {
  min-width: 680rpx;
}
.settings-desc {
  display: flex;
  align-items: baseline;
  margin-bottom: 28rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #e8e2da;
}
.sd-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #9c1630;
  margin-right: 20rpx;
}
.sd-text {
  font-size: 22rpx;
  color: #55524c;
}
.f-input-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}
.f-input-wrap .f-input {
  flex: 1;
}
.f-clear-secret {
  position: absolute;
  right: 16rpx;
  font-size: 20rpx;
  color: #9c1630;
  padding: 8rpx;
}
/* 系统设置行: 标签加宽, 保证 AccessKeyId / AccessKeySecret 等长字段名完整显示 (2026-09-02)
   三级选择器覆盖 .settings-card .f-label(150rpx) 与基础 .f-label(150rpx) */
.settings-card .set-row .f-label { width: 210rpx; }
/* 小眼睛: 敏感字段明文/密文切换 */
.f-eye {
  position: absolute;
  right: 14rpx;
  font-size: 30rpx;
  line-height: 1;
  padding: 10rpx 8rpx;
  color: #9a958c;
  z-index: 2;
}
.f-eye.on { color: #c41e3a; }
/* 输入框右侧留白, 避免内容被小眼睛/清空遮挡 */
.f-input-wrap.with-eye .f-input { padding-right: 76rpx; }
.f-input-wrap.with-eye.has-clear .f-input { padding-right: 152rpx; }
/* 清空按钮左移, 给小眼睛让位 */
.f-input-wrap.with-eye .f-clear-secret { right: 74rpx; }
.settings-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 30rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #e8e2da;
}
.settings-tip {
  font-size: 20rpx;
  color: #8a857c;
  flex: 1;
  margin-right: 20rpx;
}
/* ===== 月结账号管理 (多月结账号 + 多仓库) ===== */
.acct-block {
  margin: 24rpx 0 8rpx;
  padding: 22rpx 20rpx;
  background: #fdfaf4;
  border: 1rpx solid #efe4d2;
  border-radius: 14rpx;
}
.acct-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.acct-title { font-size: 28rpx; font-weight: 600; color: #2a2a2a; }
.acct-add { font-size: 24rpx; color: #9c1630; padding: 4rpx 8rpx; }
.acct-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 21rpx;
  color: #8a857c;
  line-height: 1.6;
}
.acct-empty {
  margin-top: 18rpx;
  padding: 36rpx 20rpx;
  text-align: center;
  font-size: 23rpx;
  color: #a08c72;
  background: #fff;
  border: 1rpx dashed #ddd0bb;
  border-radius: 10rpx;
}
.acct-item {
  margin-top: 16rpx;
  padding: 18rpx 20rpx;
  background: #fff;
  border: 1rpx solid #eee3d2;
  border-radius: 10rpx;
}
.acct-row1 {
  display: flex;
  align-items: center;
}
.acct-name { font-size: 26rpx; color: #2a2a2a; font-weight: 500; }
.acct-badge {
  margin-left: 14rpx;
  padding: 2rpx 14rpx;
  font-size: 19rpx;
  color: #fff;
  background: #4a8a5a;
  border-radius: 999rpx;
}
.acct-badge.off { background: #b4a89a; }
.acct-badge.def { background: #9c1630; }
.acct-meta {
  display: block;
  margin-top: 8rpx;
  font-size: 21rpx;
  color: #8a857c;
}
.acct-ops {
  display: flex;
  flex-wrap: wrap;
  margin-top: 14rpx;
  padding-top: 14rpx;
  border-top: 1rpx solid #f2ece2;
}
.acct-op {
  margin-right: 26rpx;
  font-size: 23rpx;
  color: #9c1630;
}
.acct-op.del { color: #b04a4a; }
.acct-section {
  margin: 26rpx 0 6rpx;
  font-size: 24rpx;
  color: #7a6a52;
  font-weight: 500;
}
.acct-hint {
  display: block;
  margin-top: 12rpx;
  font-size: 20rpx;
  color: #a08c72;
  text-align: center;
}
/* C/OSS 配置测试连接结果 */
.oss-test-result {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-top: 16rpx;
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
  background: #f6f1ea;
  font-size: 22rpx;
  line-height: 1.5;
}
.oss-test-icon {
  font-weight: 700;
  flex-shrink: 0;
}
.oss-test-icon.ok { color: #2e9e5b; }
.oss-test-icon.bad { color: #c41e3a; }
.oss-test-msg {
  color: #4a443d;
  flex: 1;
  white-space: pre-wrap;
}
/* 动态管理: 发布权限开关 一行显示 */
.moment-cfg-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}
.moment-cfg-label {
  font-size: 26rpx;
  color: #2a2a2a;
  margin-right: 16rpx;
  flex-shrink: 0;
}
.moment-cfg-save {
  margin-left: 16rpx;
}

/* 分类布局 (商品/课程管理) */
.cate-module {
  display: flex;
  align-items: stretch;
  gap: 20rpx;
  height: 100%;
  padding: 0;
}
.cate-panel {
  width: 260rpx;
  background: #fffafa;
  border-radius: 16rpx;
  border: 1rpx solid #e8e2da;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  transition: width 0.2s;
}
.cate-panel.collapsed {
  width: 56rpx;
}
.cate-toggle {
  font-size: 30rpx;
  color: #c41e3a;
  padding: 0 10rpx;
}
.cate-panel.collapsed .cate-panel-list,
.cate-panel.collapsed .cate-add {
  display: none;
}
.cate-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #e8e2da;
}
.cate-panel-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #9c1630;
}
.cate-add {
  font-size: 22rpx;
  color: #c41e3a;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: #f8f5f0;
}
.cate-panel-list {
  flex: 1;
  max-height: 520px;
}
.cate-row {
  display: flex;
  align-items: center;
  padding: 18rpx 20rpx;
  border-bottom: 1rpx solid #e8e2da;
  gap: 8rpx;
}
.cate-row.active {
  background: #f8f5f0;
}
.cate-row-name {
  flex: 1;
  min-width: 0;
  font-size: 24rpx;
  color: #2a2a2a;
}
.cate-row.active .cate-row-name {
  color: #c41e3a;
  font-weight: 500;
}
.cate-row-badge {
  font-size: 18rpx;
  color: #6e7f5a;
  background: #fbe9ec;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
}
.cate-row-badge.off {
  color: #9c1630;
  background: #fbe9ec;
}
.cate-row-ops {
  display: none;
  gap: 6rpx;
}
.cate-row:hover .cate-row-ops {
  display: flex;
}
.cate-op {
  font-size: 18rpx;
  color: #c41e3a;
  background: #f8f5f0;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
}
.cate-op.danger {
  color: #9c1630;
}
.cate-main {
  flex: 1;
  min-width: 0;
}
.table-empty {
  text-align: center;
  color: #8a857c;
  font-size: 24rpx;
  padding: 60rpx 0;
}

/* 属性编辑器 */
.attr-editor {
  margin-bottom: 20rpx;
  padding: 20rpx;
  background: #f8f5f0;
  border-radius: 12rpx;
}
.attr-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.attr-title {
  font-size: 24rpx;
  font-weight: 500;
  color: #2a2a2a;
}
.attr-add {
  font-size: 22rpx;
  color: #c41e3a;
}
.attr-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.attr-input {
  flex: 1;
  height: 64rpx;
  background: #fffafa;
  border-radius: 10rpx;
  padding: 0 18rpx;
  font-size: 24rpx;
  color: #2a2a2a;
  border: 1rpx solid #e8e2da;
}
.attr-del {
  font-size: 24rpx;
  color: #9c1630;
  padding: 8rpx 10rpx;
}
.attr-empty {
  text-align: center;
  font-size: 22rpx;
  color: #8a857c;
  padding: 16rpx 0;
}

.f-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}
.f-pills.wrap {
  flex: 1;
}
.f-pills .pill {
  padding: 8rpx 22rpx;
  border-radius: 999rpx;
  background: #f8f5f0;
  font-size: 24rpx;
  color: #55524c;
  border: 2rpx solid transparent;
}
.f-pills .pill.on {
  color: #c41e3a;
  border-color: #c41e3a;
  background: #fbe9ec;
  font-weight: 500;
}
.f-static {
  flex: 1;
  font-size: 26rpx;
  color: #2a2a2a;
}
.st-unpaid { color: #9c1630; font-weight: 500; }
.st-wait { color: #c41e3a; font-weight: 500; }
.st-done { color: #6e7f5a; font-weight: 500; }
.st-doing { color: #c41e3a; font-weight: 500; }
.st-unshipped { color: #c41e3a; font-weight: 500; }
.st-unreceived { color: #c41e3a; font-weight: 500; }
.st-done { color: #6e7f5a; font-weight: 500; }
.st-refunded { color: #55524c; font-weight: 500; }
.td-logis {
  display: block;
  font-size: 20rpx;
  color: #8a857c;
  margin-top: 4rpx;
}
/* 订单来源端标记 (小程序 / H5 / App) */
.td-platform {
  display: inline-block;
  margin-top: 6rpx;
  margin-right: 8rpx;
  padding: 2rpx 12rpx;
  font-size: 19rpx;
  border-radius: 6rpx;
  color: #7a6a52;
  background: #f2ece2;
}
.td-platform.pf-wx { color: #0f6e56; background: #e1f5ee; }
.td-platform.pf-h5 { color: #185fa5; background: #e6f1fb; }
.td-platform.pf-app { color: #854f0b; background: #faeeda; }
/* 售后管理: 搜索框 */
.as-search-bar {
  position: relative;
  margin: 0 0 20rpx;
  display: flex;
  align-items: center;
}
.as-search-input {
  flex: 1;
  height: 64rpx;
  padding: 0 60rpx 0 20rpx;
  font-size: 26rpx;
  color: #2a2a2a;
  background: #fdf6ea;
  border: 1rpx solid #e8dcc4;
  border-radius: 32rpx;
  outline: none;
}
.as-search-input::placeholder { color: #b3a48c; }
.as-search-clear {
  position: absolute;
  right: 20rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 40rpx;
  height: 40rpx;
  line-height: 40rpx;
  text-align: center;
  font-size: 24rpx;
  color: #9e8f78;
  background: #e8e2da;
  border-radius: 50%;
}
/* 售后管理: 单元格内次要信息行 / 弹窗只读文本 / 回复回显 */
.td-sub {
  display: block;
  font-size: 20rpx;
  color: #8a857c;
  margin-top: 4rpx;
}
/* 售后管理: 同订单分组 (子条目缩进显示) */
.tr-sub { background: rgba(196, 117, 58, 0.04); }
.as-sub-tag {
  display: block;
  font-size: 22rpx;
  color: #c4753a;
  font-weight: 600;
  padding-left: 16rpx;
}
.as-sub-orderno { padding-left: 16rpx; }
.as-group-badge {
  display: inline-block;
  font-size: 18rpx;
  color: #8a6a3a;
  background: rgba(196, 117, 58, 0.12);
  border-radius: 6rpx;
  padding: 2rpx 10rpx;
  margin-top: 6rpx;
}
.f-text {
  flex: 1;
  font-size: 26rpx;
  color: #2a2a2a;
  line-height: 1.5;
  word-break: break-all;
}
.as-reply-echo {
  color: #c41e3a;
}
/* 时间列: 单行显示 */
.w-time {
  width: 220rpx;
  white-space: nowrap;
  font-size: 22rpx;
  color: #55524c;
}

/* C/OSS 视频存储管理 */
.oss-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16rpx;
  margin: 16rpx 0;
}
.oss-summary {
  display: flex;
  gap: 16rpx;
  margin-left: auto;
  font-size: 22rpx;
  color: #55524c;
}
.oss-stat {
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  background: #f8f5f0;
}
.oss-video-table .oss-col-title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.oss-course {
  font-size: 24rpx;
  color: #2a2a2a;
  font-weight: 500;
}
.oss-episode {
  font-size: 20rpx;
  color: #8a857c;
}
.oss-col-type {
  width: 200rpx;
  flex-shrink: 0;
  white-space: nowrap;
  font-size: 22rpx;
}
.oss-col-size {
  width: 120rpx;
  flex-shrink: 0;
  font-size: 22rpx;
  color: #55524c;
}
.oss-col-ops {
  width: 240rpx;
  flex-shrink: 0;
}
.migrate-progress {
  display: flex;
  align-items: center;
  gap: 10rpx;
  width: 100%;
}
.mp-bar {
  flex: 1;
  height: 14rpx;
  border-radius: 8rpx;
  background: #e7ecf1;
  overflow: hidden;
  min-width: 80rpx;
}
.mp-fill {
  height: 100%;
  background: linear-gradient(90deg, #4a90d9, #2f6fb0);
  border-radius: 8rpx;
  transition: width 0.4s ease;
}
.mp-pct {
  font-size: 20rpx;
  color: #2f6fb0;
  flex-shrink: 0;
  min-width: 56rpx;
  text-align: right;
}
/* 表头筛选: 仅保留倒三角按钮(课程/课时、存储 旁) */
.oss-caret-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #f6f1ea;
  border: 1rpx solid #e2c9d0;
  cursor: pointer;
}
.oss-caret-btn.on {
  background: #c41e3a;
  border-color: #c41e3a;
}
.oss-caret-ico {
  font-size: 20rpx;
  line-height: 1;
  color: #b07a1e;
}
.oss-caret-btn.on .oss-caret-ico {
  color: #fff;
}
.oss-opt {
  padding: 14rpx 22rpx;
  font-size: 22rpx;
  color: #33302b;
  white-space: nowrap;
  border-bottom: 1rpx solid #f3eee8;
}
.oss-opt:last-child {
  border-bottom: none;
}
.oss-opt.on {
  color: #c41e3a;
  background: #fdf3f5;
  font-weight: 600;
}
.oss-opt:active {
  background: #f6f1ea;
}
/* 表头筛选: 下拉入口嵌入表头单元格(课程/课时、存储 旁) */
.oss-video-table .tr.th .oss-th-filter {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
  flex-wrap: nowrap;
}
.oss-th-label {
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}
/* 表头筛选下拉面板: fixed 定位(避免被 .table overflow 裁剪) */
.oss-th-panel {
  position: fixed;
  z-index: 80;
  background: #fff;
  border: 1rpx solid #e7ded5;
  border-radius: 12rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
  max-height: 480rpx;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.oss-th-panel-mask {
  position: fixed;
  inset: 0;
  z-index: 70;
}
/* 进度条下方的网速/剩余时间(总是显示) */
.ep-up-meta {
  font-size: 20rpx;
  color: #5a6b7b;
  text-align: right;
}
.oss-dropdown-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
}
.op.done {
  color: #3d7a4e;
}
/* 删除(危险操作): 加深红 + 描边, 与"搬运到 C/OSS"区分 */
.op.del {
  color: #fff;
  background: #c41e3a;
  border-radius: 6rpx;
  font-weight: 600;
}
.op.del:active {
  background: #9c1630;
}

/* 弹窗表单 */
.form-sheet {
  padding: 30rpx;
  padding-bottom: 60rpx;
  max-height: 75vh;
  overflow-y: auto;
}
.sheet-title {
  text-align: center;
  font-size: 30rpx;
  font-weight: 500;
  color: #2a2a2a;
  margin-bottom: 24rpx;
}
/* 强制终止全部上传按钮 (2026-08-30) */
.abort-all-btn {
  display: inline-block;
  margin-left: 16rpx;
  font-size: 22rpx;
  font-weight: 400;
  color: #fff;
  background: #9c1630;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  vertical-align: middle;
  cursor: pointer;
}
.abort-all-btn:hover {
  background: #7e1126;
}
/* 清除断点记录按钮 (2026-08-30) */
.clear-resume-btn {
  display: inline-block;
  margin-left: 12rpx;
  font-size: 20rpx;
  font-weight: 400;
  color: #8a857c;
  border: 1rpx solid #d8d2c8;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  vertical-align: middle;
  cursor: pointer;
}
.clear-resume-btn:hover {
  color: #9c1630;
  border-color: #c9a9a3;
}
.f-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}
/* 视频集编辑 */
.ep-list {
  display: flex;
  flex-direction: column;
}
/* 上传排队提示 (2026-08-31) */
.ep-tip {
  font-size: 20rpx;
  color: #a0834a;
  background: #faf6ee;
  border: 1rpx dashed #e0d3b8;
  border-radius: 8rpx;
  padding: 8rpx 12rpx;
  margin-bottom: 12rpx;
  line-height: 1.5;
}
.ep-item {
  background: #fbe9ec;
  border: 1rpx solid #e6dcca;
  border-radius: 12rpx;
  padding: 12rpx;
  margin-bottom: 12rpx;
}
.ep-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 8rpx;
}
.ep-row:last-child {
  margin-bottom: 0;
}
/* 课时文本说明输入框 */
.ep-text {
  flex: 1;
  height: 100rpx;
  min-height: 100rpx;
  font-size: 24rpx;
  line-height: 1.5;
}
.ep-index {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #efe3cd;
  color: #c41e3a;
  font-size: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ep-title {
  flex: 1;
}
.ep-op {
  font-size: 26rpx;
  color: #c41e3a;
  padding: 4rpx 10rpx;
  flex-shrink: 0;
  cursor: pointer;
}
.ep-op:hover {
  background: #fdf1f1;
  border-radius: 8rpx;
}
.ep-op.danger {
  color: #9c1630;
}
/* 课时 免费/付费 切换 */
.ep-free {
  font-size: 22rpx;
  color: #9c1630;
  border: 1rpx solid #d9a29e;
  border-radius: 8rpx;
  padding: 4rpx 14rpx;
  margin-left: 10rpx;
  flex-shrink: 0;
  cursor: pointer;
  transition: background 0.15s ease;
}
.ep-free:hover {
  background: #fdf1f1;
}
.ep-free.on {
  color: #3d7a4e;
  border-color: #9cc3a7;
}
.ep-free.on:hover {
  background: #f0f7f1;
}
/* 课时行内上传进度 (多课时并行, 各自独立) */
.ep-up {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6rpx;
  margin-left: 10rpx;
  flex-shrink: 0;
}
.ep-up-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10rpx;
}
.ep-up-status {
  font-size: 20rpx;
  color: #b07a1e;
  text-align: right;
}
/* 排队等待状态 (2026-08-30) */
.ep-up.queued {
  flex-direction: row;
  background: #f6f1e8;
  border: 1rpx dashed #c9b891;
  border-radius: 10rpx;
  padding: 8rpx 14rpx;
}
.ep-up-pct.queued-txt {
  color: #8a857c;
  font-size: 24rpx;
  letter-spacing: 1rpx;
}
.ep-up-bar {
  width: 150rpx;
  height: 14rpx;
  background: #f0ebe4;
  border-radius: 7rpx;
  overflow: hidden;
}
.ep-up-fill {
  height: 100%;
  background: #c41e3a;
  border-radius: 7rpx;
  transition: width 0.2s ease;
}
.ep-up-pct {
  font-size: 22rpx;
  color: #c41e3a;
  min-width: 52rpx;
  text-align: right;
}
.ep-up-speed {
  font-size: 20rpx;
  color: #5a6b7b;
  flex-shrink: 0;
}
.ep-up-btn {
  font-size: 22rpx;
  color: #fff;
  background: #8a7a63;
  border-radius: 8rpx;
  padding: 5rpx 14rpx;
  flex-shrink: 0;
  line-height: 1.4;
  cursor: pointer;
  transition: background 0.15s ease;
}
.ep-up-btn:hover {
  background: #6f614d;
}
.ep-up-btn.danger {
  color: #fff;
  background: #c41e3a;
}
.ep-up-btn.danger:hover {
  background: #9c1630;
}
.f-label {
  width: 150rpx;
  font-size: 24rpx;
  color: #55524c;
  flex-shrink: 0;
}
.f-input {
  flex: 1;
  height: 72rpx;
  background: #f8f5f0;
  border-radius: 10rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  color: #2a2a2a;
}
.f-textarea {
  flex: 1;
  height: 120rpx;
  background: #f8f5f0;
  border-radius: 10rpx;
  padding: 14rpx 20rpx;
  font-size: 26rpx;
  color: #2a2a2a;
}
/* 盘道详情内容: 长文编辑 (不限字数, 较高文本域) */
.pd-content-ta {
  height: 320rpx;
  min-height: 320rpx;
  line-height: 1.6;
}
/* 课程表单: 标题/描述输入框加大 */
.f-title {
  height: 96rpx;
  font-size: 30rpx;
}
.f-desc {
  min-height: 320rpx;
}
/* 商品图片上传 */
.f-img-box { flex: 1; }
.f-img-row { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 12rpx; }
.f-img-item { position: relative; width: 120rpx; height: 120rpx; }
.f-img-thumb { width: 120rpx; height: 120rpx; border-radius: 10rpx; border: 1rpx solid #e6dcca; }
.f-img-del {
  position: absolute;
  right: -8rpx;
  top: -8rpx;
  width: 34rpx;
  height: 34rpx;
  line-height: 34rpx;
  text-align: center;
  background: #9c1630;
  color: #fffafa;
  font-size: 20rpx;
  border-radius: 50%;
  z-index: 3;
}
.f-img-add {
  width: 120rpx;
  height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed #d8ccb8;
  border-radius: 10rpx;
  color: #c41e3a;
  font-size: 22rpx;
  background: #fbe9ec;
}
/* 小程序接管 */
.btn-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 60rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #c41e3a, #6b1022);
  padding: 0 28rpx;
  margin-left: auto;
}
.btn-add text { font-size: 24rpx; color: #fffafa; }
.wxmp-tip { font-size: 22rpx; color: #55524c; margin-bottom: 16rpx; line-height: 1.6; }
.wxmp-bind-tip { font-size: 22rpx; color: #8a857c; margin-top: 16rpx; line-height: 1.6; }
.wxmp-strong { color: #9c1630; }
.wxmp-auth { margin-top: 20rpx; background: #fbe9ec; border-radius: 12rpx; padding: 18rpx; }
.wxmp-auth-tip { display: block; font-size: 22rpx; color: #55524c; margin-bottom: 8rpx; }
.wxmp-auth-url {
  display: block;
  font-size: 20rpx;
  color: #3f6f8c;
  word-break: break-all;
  overflow-wrap: anywhere;
  line-height: 1.6;
}
.btn-copy {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 68rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #c41e3a, #6b1022);
  margin-top: 14rpx;
}
.btn-copy text { font-size: 24rpx; color: #fffafa; }
.qr-sheet { text-align: center; }
/* 上传流程触发的确认弹窗必须高于「课程编辑弹窗」(同为 .pp-mask 时由 DOM 顺序决定层级,
   故该弹窗已置于模板最末尾, 这里再抬高层级做双保险) */
.pp-mask.topmost { z-index: 9999; }
/* 断点续传确认弹窗 (5s 倒计时, 默认继续上传) */
.rc-sheet { padding: 40rpx 34rpx 30rpx; }
.rc-body { padding: 6rpx 0 24rpx; }
.rc-main { display: block; font-size: 27rpx; color: #2b2b2b; line-height: 1.7; }
.rc-pct { color: #c41e3a; font-weight: 600; }
.rc-tip { display: block; font-size: 22rpx; color: #8a857c; margin-top: 12rpx; line-height: 1.6; }
.rc-info { display: block; font-size: 24rpx; color: #5a5a5a; margin-top: 10rpx; line-height: 1.6; word-break: break-all; }
.rc-count { display: block; font-size: 22rpx; color: #c41e3a; margin-top: 16rpx; }
.wxmp-qr-img { width: 400rpx; margin: 20rpx auto; display: block; }
.wxmp-qr-tip { font-size: 22rpx; color: #8a857c; margin: 30rpx 0; }
.f-pills {
  display: flex;
  flex: 1;
}
.f-pills .pill {
  margin-left: 0;
  margin-right: 12rpx;
}
.sheet-actions {
  display: flex;
  justify-content: flex-end;
  gap: 20rpx;
  margin-top: 30rpx;
}

/* 窄屏适配 */
@media screen and (max-width: 800px) {
  .sidebar {
    width: 200rpx;
  }
}

/* ===== 横屏/宽屏: 信息平铺, 不随 rpx 等比放大 (px 固定) =====
   注意: 手机横屏 CSS 宽度常 <800px (如 780px), 仅靠 min-width 判断会漏掉
   → 用 (orientation: landscape) 保证 App 横屏必触发 */
@media screen and (min-width: 800px), screen and (orientation: landscape) {
  .admin-dash {
    max-width: 1400px;
    margin: 0 auto;
  }
  .sidebar {
    width: 208px;
    flex-shrink: 0;
  }
  .content-inner {
    padding: 18px 22px;
  }
  .topbar {
    padding: 14px 22px;
  }
  .tb-title {
    font-size: 20px;
  }
  .tb-link {
    font-size: 14px;
  }
  .module-title {
    font-size: 18px;
  }
  .menu-label {
    font-size: 14px;
  }
  .menu-icon {
    font-size: 18px;
  }
  .menu-item {
    padding: 10px 14px;
  }
  .logo-name { font-size: 17px; }
  .logo-sub-txt { font-size: 12px; }
  .logo-ver { font-size: 11px; }
  .logo-area { padding: 18px 12px 14px; }
  .admin-user { padding: 12px 12px; }
  .au-name { font-size: 14px; }
  .au-role { font-size: 11px; }
  .stat-card {
    font-size: 13px;
    padding: 16px;
  }
  .stat-grid { gap: 14px; }
  .stat-num {
    font-size: 24px;
  }
  .stat-label {
    font-size: 13px;
  }
  .td {
    font-size: 13px;
    padding: 10px 10px;
  }
  .op {
    font-size: 13px;
    margin-left: 0;
  }
  .w-time {
    font-size: 12px;
  }
  .f-label {
    font-size: 13px;
  }
  .f-input {
    font-size: 14px;
  }
  .f-textarea { font-size: 14px; }
  .pill {
    font-size: 13px;
  }
  .sheet-title {
    font-size: 17px;
  }
  .panel-title { font-size: 16px; }
  .panel-more { font-size: 13px; }
  .recent-row { font-size: 13px; padding: 10px 12px; }
  .attr-title { font-size: 14px; }
  .attr-input { font-size: 14px; }

  /* 商品分类栏 (左侧分类) 固定宽 */
  .cate-panel { width: 180px; flex-shrink: 0; }
  .cate-row { font-size: 13px; padding: 9px 12px; }
  .cate-op { font-size: 12px; }
  /* 表头字号 */
  .th { font-size: 13px; padding: 10px 10px; }
  /* 成交分布双饼图: PC/横屏左右并列 */
  .analysis-pies {
    flex-direction: row;
    gap: 16px;
  }
  .analysis-pies .analysis-section { flex: 1; min-width: 0; }
  /* 售后搜索框宽屏适配 */
  .as-search-input { height: 36px; font-size: 14px; padding: 0 40px 0 14px; }
  .as-search-clear { width: 22px; height: 22px; line-height: 22px; right: 12px; font-size: 12px; }
  /* 订单分类统计条宽屏适配 */
  .order-type-stats .ots-label { font-size: 13px; }
  .order-type-stats .ots-val { font-size: 13px; }
  /* 订单操作区宽屏: 按钮不裁切, 留右间距 */
  .w-ops-4 { padding-right: 8px; }
  .op-col { width: 60px; }
  /* 订单表格宽屏列宽 (px, 避免商品列空白过宽) */
  .orders-table .tr { min-width: 0; }
  .orders-table .w-no { width: 130px; }
  .orders-table .w-user { width: 80px; }
  .orders-table .w-name { flex: 1 1 100px; min-width: 100px; max-width: 200px; }
  .orders-table .w-price { width: 70px; }
  .orders-table .w-time { width: 160px; }
  .orders-table .w-status { width: 80px; }
  .orders-table .w-ops-4 { width: 280px; }
}
/* 后台: 保持 1400px 宽 (原有设计), 收拢居中 */
@media screen and (min-width: 1025px) {
  .admin-dash {
    max-width: 1400px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 60rpx rgba(69, 26, 3, 0.06);
  }
  /* PC 端课程编辑弹窗更宽: 突破底部弹出宽度限制, 垂直居中大面板 */
  .pp-mask.course-mask {
    align-items: center;
  }
  .course-mask .course-sheet {
    width: 900px;
    max-width: 94vw;
    max-height: 86vh;
    border-radius: 20rpx;
    margin: 0 auto;
  }
  .course-sheet .form-sheet {
    max-height: 78vh;
  }
}

</style>
