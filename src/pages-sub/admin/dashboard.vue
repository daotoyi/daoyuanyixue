<template>
  <view class="admin-dash">
    <!-- ===== 左侧侧边栏 ===== -->
    <view class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <view class="logo-area">
        <view class="logo-seal" @tap="sidebarCollapsed = !sidebarCollapsed"><text>{{ sidebarCollapsed ? '☰' : '道' }}</text></view>
        <text class="logo-name" v-if="!sidebarCollapsed">道元易学</text>
        <text class="logo-sub" v-if="!sidebarCollapsed">管理后台（{{ verNum }}）</text>
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
        <text class="tb-title">{{ currentModule.label }}</text>
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
                  <image class="cover-preview" v-if="pdForm.cover" :src="pdForm._coverUrl || pdForm.cover" mode="aspectFill" @tap="previewPandaoCover"></image>
                  <text class="f-label-sm" v-if="pdForm.cover" @tap="pdForm.cover = ''">移除</text>
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
              </view>
              <view class="td w-ops w-ops-4 ops" v-if="canWrite">
                <text class="op op-col" :class="{ hide: o.status !== '待付款' }" @tap="payForOrder(o)">代收款</text>
                <text class="op op-col" :class="{ hide: o.status !== '待发货' }" @tap="openShip(o)">发货</text>
                <text class="op op-col danger" :class="{ hide: o.status === '已退款' || o.status === '已完成' || userRole === 'staff' }" @tap="refundOrder(o)">退款</text>
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

            <view class="f-row" v-for="f in currentSettingsTab.fields" :key="f.key">
              <text class="f-label">{{ f.label }}</text>
              <view class="f-input-wrap">
                <switch
                  v-if="f.type === 'switch'"
                  :checked="settingsForm[f.key] === '1' || settingsForm[f.key] === true"
                  color="#c41e3a"
                  style="transform: scale(0.85)"
                  @change="settingsForm[f.key] = $event.detail.value ? '1' : '0'"
                />
                <picker
                  v-else-if="f.type === 'select'"
                  :range="f.options || []"
                  @change="settingsForm[f.key] = (f.options || [])[$event.detail.value]"
                >
                  <view class="f-input" :class="{ ph: !settingsForm[f.key] }">{{ settingsForm[f.key] || (f.options && f.options[0]) || '请选择' }}</view>
                </picker>
                <input
                  v-else
                  class="f-input"
                  :password="!!f.secret"
                  v-model="settingsForm[f.key]"
                  :placeholder="f.secret && settingsLoaded[activeSettingsTab] ? (f.secret && !settingsForm[f.key] && hasSecret(f.key) ? '•••••• 已配置（留空不修改）' : f.placeholder || '') : f.placeholder || ''"
                />
                <text
                  v-if="f.secret && hasSecret(f.key) && settingsForm[f.key]"
                  class="f-clear-secret"
                  @tap="clearSettingsSecret(f)"
                >清空</text>
              </view>
            </view>

            <view class="settings-actions">
              <text class="settings-tip">敏感字段保存后不显示明文，留空保存则保持原值</text>
              <view class="btn-p sm" v-if="canManageSettings" @click="saveSettings">{{ settingsSaving ? '保存中...' : '保存配置' }}</view>
            </view>
          </view>

          <!-- ===== C/OSS 存储管理 (启用后显示视频存储列表) ===== -->
          <view class="settings-card" v-if="activeSettingsTab === 'oss' && ossEnabled">
            <view class="settings-desc">
              <text class="sd-title">视频存储管理（{{ ossVideoList.length }}）</text>
              <text class="sd-text">本地存储 = CloudBase 云存储；C/OSS = 对象存储。点击「搬运到 C/OSS」将视频迁移到对象存储。</text>
            </view>
            <view class="oss-toolbar">
              <view class="btn-p plain sm" @click="loadOssVideos">{{ ossLoading ? '加载中...' : '刷新列表' }}</view>
              <text class="oss-summary" v-if="ossVideoList.length">
                <text class="oss-stat">本地 {{ ossVideosLocal.length }} 个 · {{ fmtFileSize(ossLocalBytes) }}</text>
                <text class="oss-stat">C/OSS {{ ossVideosRemote.length }} 个 · {{ fmtFileSize(ossRemoteBytes) }}</text>
              </text>
            </view>
            <view class="table oss-video-table" v-if="ossVideoList.length">
              <view class="tr th">
                <text class="td oss-col-title">课程 / 课时</text>
                <text class="td oss-col-size">大小</text>
                <text class="td oss-col-type">存储</text>
                <text class="td oss-col-ops">操作</text>
              </view>
              <view class="tr" v-for="(v, vi) in ossVideoList" :key="vi">
                <view class="td oss-col-title">
                  <text class="oss-course">{{ v.course_title }}</text>
                  <text class="oss-episode">{{ v.episode_title }}</text>
                </view>
                <text class="td oss-col-size">{{ fmtFileSize(v.size_bytes) }}</text>
                <text class="td oss-col-type" :class="v.inOss ? 'st-done' : 'st-wait'">{{ v.inOss ? 'C/OSS' : '本地' }}</text>
                <view class="td oss-col-ops ops">
                  <text class="op" v-if="!v.inOss && canManageSettings" @tap="migrateOssVideo(v)">搬运到 C/OSS</text>
                  <text class="op done" v-else>已就绪</text>
                </view>
              </view>
            </view>
            <view class="empty-tip" v-else-if="!ossLoading">暂无可管理的视频</view>
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
        <view class="sheet-title">{{ courseForm.id ? '编辑课程' : '新增课程' }}</view>
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
                  <view class="ep-up-bar"><view class="ep-up-fill" :style="{ width: (ep._progress || 0) + '%' }"></view></view>
                  <text class="ep-up-pct">{{ ep._progress || 0 }}%</text>
                  <text class="ep-up-btn" @tap="togglePauseEpisodeUpload(ep)">{{ ep._paused ? '继续' : '暂停' }}</text>
                  <text class="ep-up-btn danger" @tap="cancelEpisodeUpload(ep)">取消</text>
                  <text class="ep-up-status" v-if="ep._status">{{ ep._status }}</text>
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
  </view>
</template>

<script setup>
const ST_CLS = {'待付款':'unpaid','待发货':'unshipped','待收货':'unreceived','已完成':'done','已取消':'cancelled','已退款':'refunded','全部':'all'}
const stCls = (v) => ST_CLS[v] || v

import { ref, computed, onMounted } from 'vue'
import { APP_VERSION } from '@/version'
import {
  adminDashboard, adminList, adminProductCreate, adminProductUpdate, adminProductDelete,
  adminOrderAnalysis,
  adminCourseCreate, adminCourseUpdate, adminOrderShip, adminOrderRefund, adminOrderDelete,
  adminOrderReconcile,
  adminUserCreate, adminUserUpdate, adminUserDelete, adminLiveCreate, adminLiveUpdate, adminMomentAudit, adminMomentDelete,
  adminCouponCreate, adminCouponUpdate, adminCouponDelete, adminRecentOrders,
  adminSettingsGet, adminSettingsSave, adminPandaoCreate, adminPandaoDelete, adminPandaoUpdate,
  adminVideosList, adminVideoMigrate,
  adminCateList, adminCateCreate, adminCateUpdate, adminCateDelete, adminLogisticsList,
  adminFeedbacksList, adminFeedbackReply, adminFeedbackDelete,
  adminAftersalesList, adminAftersaleReply, adminAftersaleDelete,
  wxmpGetAuthUrl, wxmpListBound, wxmpGetExperienceQr, wxmpUploadCode, wxmpSubmitAudit, wxmpRelease,
} from '../../api/api'
import { useUserStore } from '../../store/index'
import { getStorage } from '../../api/cloudbase'
import { resolveCloudList, resolveCloudUrl } from '../../utils/avatar'

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

function emptyPdForm() {
  return { id: 0, title: '', day: '', start_date: '', time: '', place: '', price: '', desc: '', content: '', status: '即将开始', cover: '' }
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
    if (f.id) {
      await adminPandaoUpdate({ id: f.id, title: f.title.trim(), day: f.day, start_date: f.start_date, time: f.time.trim(), place: f.place.trim(), price: f.price.trim(), desc: f.desc.trim(), content: f.content.trim(), status: f.status, cover: f.cover || '' })
      uni.showToast({ title: '已保存', icon: 'success' })
    } else {
      await adminPandaoCreate({ title: f.title.trim(), day: f.day, start_date: f.start_date, time: f.time.trim(), place: f.place.trim(), price: f.price.trim(), desc: f.desc.trim(), content: f.content.trim(), status: f.status, cover: f.cover || '' })
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
  }
  pdForm.value._coverUrl = pd._coverUrl || ''
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

/* 盘道封面: 上传 + 预览 */
function uploadPandaoCover() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (res) => {
      const filePath = res.tempFilePaths[0]
      uni.showLoading({ title: '上传中...' })
      try {
        const storage = await getStorage()
        if (!storage || !storage.uploadFile) throw new Error('云存储不可用')
        const cloudPath = 'pandao/p' + Date.now() + '_' + Math.floor(Math.random() * 1000) + '.png'
        const upRes = await storage.uploadFile(filePath, cloudPath)
        const fileID = upRes.fileID || (upRes.file && upRes.file.fileID)
        if (!fileID) throw new Error('上传失败')
        // 存 cloud:// fileID (私有桶, 显示时由 resolveCloudUrl 转签名 URL)
        pdForm.value.cover = fileID
        pdForm.value._coverUrl = await resolveCloudUrl(fileID).catch(() => '')
        uni.showToast({ title: '封面已上传', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: uploadErrMsg(e), icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  })
}
function previewPandaoCover() {
  const url = pdForm.value._coverUrl || pdForm.value.cover
  if (url) uni.previewImage({ urls: [url] })
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
        const upRes = await storage.uploadFile(filePath, cloudPath, (ratio) => {
          const pct = Math.min(99, Math.floor(ratio * 100))
          if (pct !== lastPct && pct % 2 === 0) {
            lastPct = pct
            uni.showLoading({ title: '上传中 ' + pct + '%', mask: true })
          }
        })
        const fileID = upRes.fileID || (upRes.file && upRes.file.fileID)
        if (!fileID) throw new Error('上传失败')
        const url = fileID.replace(/^cloud:\/\/[^/]+\//, 'https://636c-cloud1-d8gs2k9m311f7272f-1464523137.tcb.qcloud.la/')
        courseForm.value.video = url
        uni.hideLoading()
        uni.showToast({ title: '视频已上传', icon: 'success' })
        // C/OSS 启用时提示是否搬运到 C/OSS (单视频 → 第一课时)
        await maybeMigrateToOss({ course_id: courseForm.value.id, episode_index: 0 })
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
function resumePercent(rec, size) {
  const total = Math.max(1, Math.ceil(size / PART_SIZE_BYTES))
  return Math.min(99, Math.round(((rec.partNumbers || []).length / total) * 100))
}

/* ===== 上传队列 (2026-08-30 排队策略): 同一时间只允许 1 个课时上传,
   其余选好文件后进入队列等待, 前一个完成/取消/失败后按顺序自动开始下一个 ===== */
const uploadQueue = ref([])        // [{ ep, filePath, fileSize }] 等待上传的课时
let currentUploadingEp = null      // 当前正在上传的课时 (非响应式, 仅流程控制)
let currentUploadingCourseId = null // 当前上传所属课程 id (切换课程时中止残留任务用)

/* 出队: 当前无上传中时, 取队列第一个开始 (防重入: 已有上传中则跳过) */
async function dequeueNext() {
  if (currentUploadingEp) return // 已有上传中, 跳过 (防止 3s 兜底与主流程 finally 重复触发)
  if (uploadQueue.value.length === 0) return
  const item = uploadQueue.value.shift()
  const ep = item && item.ep
  if (!ep || !item.filePath) return dequeueNext()
  ep._queued = false
  ep._status = ''
  await startUpload(ep, item.filePath, item.fileSize)
}

/* 取消排队 (等待中的课时): 从队列移除, 恢复"上传"按钮 */
function removeFromQueue(ep) {
  if (!ep) return
  uploadQueue.value = uploadQueue.value.filter((q) => q.ep !== ep)
  ep._queued = false
  ep._status = ''
  uni.showToast({ title: '已取消排队', icon: 'none' })
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
      if (currentUploadingEp && currentUploadingEp !== ep) {
        // 已有课时在上传中 → 加入队列等待 (排队策略: 一个完成后自动开始下一个)
        uploadQueue.value.push({ ep, filePath, fileSize })
        ep._queued = true
        ep._status = '等待上传'
        ep._progress = 0
        uni.showToast({ title: '已加入上传队列，前一个完成后自动开始', icon: 'none' })
        return
      }
      await startUpload(ep, filePath, fileSize)
    },
  })
}

/* 真正开始上传一个课时 (含断点续传检测; 完成/失败/取消后自动出队下一个) */
async function startUpload(ep, filePath, fileSize) {
  const i = courseForm.value.episodes.indexOf(ep)
  // 断点续传检测: 同尺寸文件有未完成上传 → 询问续传
  let resumeInfo = null
  const resume = fileSize ? findResume(fileSize) : null
  if (resume && resume.uploadId) {
    const confirmRes = await new Promise((r) => {
      uni.showModal({
        title: '发现未完成的上传',
        content: `上次该文件已上传约 ${resumePercent(resume, fileSize)}%，是否从断点继续上传？（若选重新上传将丢弃旧进度）`,
        confirmText: '继续上传',
        cancelText: '重新上传',
        success: (rr) => r(rr.confirm === true),
        fail: () => r(false),
      })
    })
    if (confirmRes) {
      resumeInfo = { uploadId: resume.uploadId, skipPartNumbers: resume.partNumbers || [] }
    } else {
      removeResume(fileSize)
    }
  }
  currentUploadingEp = ep
  currentUploadingCourseId = courseForm.value.id // 记录所属课程, 切换课程时中止残留任务
  const control = { paused: false, cancelled: false, abortFns: new Set() }
  ep._control = control
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
    // getStorage 加 15s 超时兜底: 防止 SDK 初始化(匿名登录)网络卡住时上传永远 0% 无反应
    const storage = await Promise.race([
      getStorage(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('云存储初始化超时，请检查网络后重试')), 15000)),
    ])
    if (!storage || !storage.uploadFile) throw new Error('云存储不可用')
    if (control.cancelled) throw Object.assign(new Error('上传已取消'), { code: 'UPLOAD_CANCELLED' })
    if (resumeInfo) { cloudPath = resume.cloudPath; control.cloudPath = cloudPath } // 续传必须用同一 cloudPath
    ep._status = ''
    const upRes = await storage.uploadFile(filePath, cloudPath, (ratio) => {
      const pct = Math.min(99, Math.round(ratio * 100))
      if (pct !== ep._progress) ep._progress = pct
      // 节流保存续传点 (10s 一次, 防直接关页面丢进度)
      const now = Date.now()
      if (control.uploadId && now - lastSaveTs > 10000) {
        lastSaveTs = now
        saveResume({ size: fileSize, cloudPath, uploadId: control.uploadId, partNumbers: control.partNumbers || [], ts: now })
      }
    }, control, (s) => {
      ep._status = s === 'retrying' ? '网络波动，自动重试中…' : s === 'paused' ? '已暂停' : s === 'resumed' ? '' : s === 'cancelling' ? '正在取消…' : ''
    }, resumeInfo || null)
    const fileID = upRes.fileID || (upRes.file && upRes.file.fileID)
    if (!fileID) throw new Error('上传失败')
    const url = fileID.replace(/^cloud:\/\/[^/]+\//, 'https://636c-cloud1-d8gs2k9m311f7272f-1464523137.tcb.qcloud.la/')
    ep.video = url
    if (!ep.title) ep.title = `第${i + 1}集`
    // 若弹窗已关闭重开 (episodes 重建为新对象), 按 _key 把 URL/标题同步到界面当前对象, 避免进度丢失 (2026-08-30)
    const curEp = courseForm.value.episodes.find((e) => e._key && e._key === ep._key)
    if (curEp && curEp !== ep) {
      curEp.video = ep.video
      if (!curEp.title) curEp.title = ep.title
    }
    ep._uploading = false
    ep._paused = false
    ep._progress = 100
    ep._status = ''
    removeResume(fileSize) // 成功清除续传点
    uni.showToast({ title: '已上传', icon: 'success' })
    removeNetListeners()
    // C/OSS 启用时提示是否搬运到 C/OSS
    await maybeMigrateToOss({ course_id: courseForm.value.id, episode_index: i })
  } catch (e) {
    removeNetListeners()
    // 失败/取消: 保存续传点 (分片保留在 COS, 下次选同文件可继续)
    if (control.uploadId) {
      saveResume({ size: fileSize, cloudPath, uploadId: control.uploadId, partNumbers: control.partNumbers || [], ts: Date.now() })
    }
    ep._uploading = false
    ep._paused = false
    ep._progress = 0
    ep._status = ''
    if (e && e.code === 'UPLOAD_CANCELLED') {
      uni.showToast({ title: '已取消(进度已保留)', icon: 'none' })
    } else {
      uni.showToast({ title: '上传中断，已保留进度，可重新选择该文件续传', icon: 'none' })
      console.error('[上传失败]', e)
    }
  } finally {
    // 无论成功/失败/取消: 释放上传锁, 自动开始队列中的下一个
    if (currentUploadingEp === ep) currentUploadingEp = null
    dequeueNext()
  }
}
/* 暂停/继续 上传 (中断所有进行中的分片, 立即暂停; 恢复后自动续传) */
function togglePauseEpisodeUpload(ep) {
  if (!ep || !ep._control || !ep._uploading) return
  console.log('[上传控制] 点击暂停/继续, 当前 paused=', ep._paused, 'abortFns=', ep._control.abortFns ? ep._control.abortFns.size : 0)
  if (ep._paused) {
    ep._control.paused = false
    ep._paused = false
    ep._status = ''
    uni.showToast({ title: '继续上传', icon: 'none' })
  } else {
    ep._control.paused = true
    ep._paused = true
    ep._status = '已暂停'
    abortAllParts(ep._control) // 中断所有并发分片请求
    uni.showToast({ title: '已暂停', icon: 'none' })
  }
}
/* 取消上传 (立即中断所有分片并清理; 乐观兜底: 3s 后强制复位 UI, 防止"正在取消"卡死) */
function cancelEpisodeUpload(ep) {
  if (!ep || !ep._control || !ep._uploading) return
  console.log('[上传控制] 点击取消, abortFns=', ep._control.abortFns ? ep._control.abortFns.size : 0)
  ep._control.cancelled = true
  ep._cancelled = true
  ep._status = '正在取消…'
  abortAllParts(ep._control) // 立即中断所有并发分片, 不等它们自然结束
  uni.showToast({ title: '正在取消...', icon: 'none' })
  // 兜底1: 1.5s 后仍未结束则再中断一次
  setTimeout(() => { if (ep && ep._uploading) abortAllParts(ep._control) }, 1500)
  // 兜底2 (2026-08-30): 3s 后若上传主流程仍未响应取消(极少数网络僵死场景), 强制复位 UI 并保留进度,
  // 避免"正在取消…"永久显示; 主流程 catch/finally 幂等, 之后即便返回也不会再改 UI
  setTimeout(() => {
    if (!ep || !ep._uploading) return
    console.warn('[上传控制] 取消 3s 未响应, 强制复位 UI (进度已保留)')
    ep._uploading = false
    ep._paused = false
    ep._status = ''
    if (ep._control && ep._control.uploadId) {
      // 尽力保存续传点, 供下次选同文件续传
      try {
        const fs = ep._fileSize || 0
        if (fs) saveResume({ size: fs, cloudPath: ep._control.cloudPath || '', uploadId: ep._control.uploadId, partNumbers: ep._control.partNumbers || [], ts: Date.now() })
      } catch (e) {}
    }
    uni.showToast({ title: '已取消(进度已保留)', icon: 'none' })
    // 强制释放上传锁并开始队列中的下一个
    if (currentUploadingEp === ep) currentUploadingEp = null
    dequeueNext()
  }, 3000)
}
/* 遍历中断 control 中所有在传分片的请求 */
function abortAllParts(control) {
  if (!control || !control.abortFns || !control.abortFns.size) return
  control.abortFns.forEach((fn) => { try { fn() } catch (e) {} })
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
  uni.showModal({
    title: 'C/OSS 存储',
    content: '是否将该视频同时存储到 C/OSS（对象存储）？',
    confirmText: '存储到 C/OSS',
    cancelText: '暂存本地',
    success: async (r) => {
      if (!r.confirm) return
      try {
        uni.showLoading({ title: '搬运中...' })
        await adminVideoMigrate(v)
        uni.hideLoading()
        uni.showToast({ title: '已存储到 C/OSS', icon: 'success' })
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.message || '搬运失败', icon: 'none' })
      }
    },
  })
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
  if (currentUploadingEp && currentUploadingCourseId !== newCid) {
    const ctrl = currentUploadingEp._control
    if (ctrl) {
      ctrl.cancelled = true
      abortAllParts(ctrl)
      if (ctrl.uploadId) {
        try {
          if (currentUploadingEp._fileSize) {
            saveResume({ size: currentUploadingEp._fileSize, cloudPath: ctrl.cloudPath || '', uploadId: ctrl.uploadId, partNumbers: ctrl.partNumbers || [], ts: Date.now() })
          }
        } catch (e) {}
      }
    }
    currentUploadingEp._uploading = false
    currentUploadingEp._status = ''
    currentUploadingEp = null
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
      { key: 'provider', label: '服务商', placeholder: '腾讯云COS / 阿里云OSS' },
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
]

const activeSettingsTab = ref(settingsTabs[0].group)
const settingsForm = ref({})
const settingsSaving = ref(false)
const settingsLoaded = ref({})
const settingsOriginal = ref({})

const currentSettingsTab = computed(
  () => settingsTabs.find((t) => t.group === activeSettingsTab.value) || settingsTabs[0]
)

function hasSecret(key) {
  return !!(settingsOriginal.value[activeSettingsTab.value] || {})[key]
}

function switchSettingsTab(group) {
  activeSettingsTab.value = group
  loadSettings(group)
  if (group === 'oss') {
    // 稍后等设置加载完成判断是否启用
    setTimeout(() => {
      if (ossEnabled.value) loadOssVideos()
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
    await adminSettingsSave({ group: cur.group, configs })
    uni.showToast({ title: '配置已保存', icon: 'success' })
    await loadSettings(cur.group)
    // 保存 C/OSS 配置后若启用则刷新视频列表
    if (cur.group === 'oss' && ossEnabled.value) loadOssVideos()
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  } finally {
    settingsSaving.value = false
  }
}

function clearSettingsSecret(f) {
  settingsForm.value[f.key] = ''
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
  } catch (e) {
    uni.showToast({ title: e.message || '加载视频列表失败', icon: 'none' })
  } finally {
    ossLoading.value = false
  }
}

/* 搬运单个视频到 C/OSS */
async function migrateOssVideo(v) {
  try {
    uni.showLoading({ title: '搬运中...' })
    await adminVideoMigrate({ course_id: v.course_id, episode_index: v.episode_index })
    uni.hideLoading()
    uni.showToast({ title: '已搬运到 C/OSS', icon: 'success' })
    await loadOssVideos()
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: e.message || '搬运失败', icon: 'none' })
  }
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
  font-size: 18rpx;
  color: rgba(240, 230, 205, 0.5);
  letter-spacing: 6rpx;
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
.op {
  font-size: 22rpx;
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
  justify-content: space-between;
  margin: 16rpx 0;
}
.oss-summary {
  display: flex;
  gap: 16rpx;
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
  width: 100rpx;
  flex-shrink: 0;
}
.oss-col-size {
  width: 120rpx;
  flex-shrink: 0;
  font-size: 22rpx;
  color: #55524c;
}
.oss-col-ops {
  width: 180rpx;
  flex-shrink: 0;
}
.op.done {
  color: #3d7a4e;
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
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-left: 10rpx;
  flex-shrink: 0;
}
.ep-up-status {
  width: 100%;
  font-size: 20rpx;
  color: #b07a1e;
}
/* 排队等待状态 (2026-08-30) */
.ep-up.queued {
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
  .logo-sub { font-size: 12px; }
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
