<template>
  <view class="admin-dash">
    <!-- ===== 左侧侧边栏 ===== -->
    <view class="sidebar">
      <view class="logo-area">
        <view class="logo-seal"><text>道</text></view>
        <text class="logo-name">道元易学</text>
        <text class="logo-sub">管理后台</text>
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
          <text class="menu-label">{{ m.label }}</text>
        </view>
      </scroll-view>

      <view class="sidebar-foot">
        <view class="admin-user">
          <text class="au-avatar">{{ userStore.userInfo.nickname ? userStore.userInfo.nickname[0] : '管' }}</text>
          <view class="au-info">
            <text class="au-name">{{ userStore.userInfo.nickname }}</text>
            <text class="au-role">{{ userRole === 'admin' ? '超级管理员' : (userRole === 'staff' ? '内部员工' : '管理员') }}</text>
          </view>
        </view>
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
              <text class="panel-title">最近订单</text>
              <text class="panel-more" @tap="switchModule('orders')">查看全部 ›</text>
            </view>
            <view class="recent-list" v-if="recentOrders.length">
              <view class="recent-row" v-for="o in recentOrders" :key="o._id || o.order_no">
                <text class="rr-no ellipsis">{{ o.order_no }}</text>
                <text class="rr-items ellipsis">{{ (o.items || []).map((i) => i.name).join('、') }}</text>
                <text class="rr-price">¥{{ o.total_price }}</text>
                <text class="rr-status">{{ o.status }}</text>
              </view>
            </view>
            <view class="recent-empty" v-else>暂无订单</view>
          </view>
        </view>

        <!-- ===== 商品管理 ===== -->
        <view v-else-if="activeModule === 'products'" class="module cate-module">
          <!-- 左侧分类栏 -->
          <view class="cate-panel">
            <view class="cate-panel-head">
              <text class="cate-panel-title">商品分类</text>
              <text class="cate-add" @tap="openCateForm('products')">＋ 新建</text>
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
                <view class="cate-row-ops" @tap.stop>
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
              <view class="btn-p sm" @click="openProductForm()">＋ 新增商品</view>
            </view>
            <view class="table">
              <view class="tr th">
                <text class="td w-img">图</text>
                <text class="td w-name">名称</text>
                <text class="td w-price">售价</text>
                <text class="td w-stock">库存</text>
                <text class="td w-status">状态</text>
                <text class="td w-ops">操作</text>
              </view>
              <view class="tr" v-for="p in productGrouped[productActiveCate] || []" :key="p.id">
                <image class="td w-img thumb" :src="p.images && p.images[0]" mode="aspectFill"></image>
                <text class="td w-name ellipsis">{{ p.name }}</text>
                <text class="td w-price">¥{{ p.price }}</text>
                <text class="td w-stock">{{ p.stock }}</text>
                <text class="td w-status" :class="p.is_show === false ? 'off' : 'on'">{{ p.is_show === false ? '已下架' : '已上架' }}</text>
                <view class="td w-ops ops">
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
          <view class="cate-panel">
            <view class="cate-panel-head">
              <text class="cate-panel-title">课程分类</text>
              <text class="cate-add" @tap="openCateForm('courses')">＋ 新建</text>
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
                <view class="cate-row-ops" @tap.stop>
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
              <view class="btn-p sm" @click="openCourseForm()">＋ 新增课程</view>
            </view>
            <view class="table">
              <view class="tr th">
                <text class="td w-name">课程</text>
                <text class="td w-price">价格</text>
                <text class="td w-stock">课时</text>
                <text class="td w-status">等级</text>
                <text class="td w-ops">操作</text>
              </view>
              <view class="tr" v-for="c in courseGrouped[courseActiveCate] || []" :key="c.id">
                <text class="td w-name ellipsis">{{ c.title }}</text>
                <text class="td w-price">¥{{ c.price }}</text>
                <text class="td w-stock">{{ c.lessons_count }}</text>
                <text class="td w-status">{{ c.level }}</text>
                <view class="td w-ops ops">
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
          <view class="table">
            <view class="tr th">
              <text class="td w-no">订单号</text>
              <text class="td w-name">商品</text>
              <text class="td w-price">金额</text>
              <text class="td w-status">状态</text>
              <text class="td w-ops">操作</text>
            </view>
            <view class="tr" v-for="o in orders" :key="o._id || o.order_no">
              <text class="td w-no ellipsis">{{ o.order_no }}</text>
              <text class="td w-name ellipsis">{{ (o.items || []).map((i) => i.name).join('、') }}</text>
              <text class="td w-price">¥{{ o.total_price }}</text>
              <view class="td w-status">
                <text :class="'st-' + stCls(o.status)">{{ o.status }}</text>
                <text class="td-logis" v-if="o.logistics_company">[{{ o.logistics_company }} {{ o.tracking_no }}]</text>
              </view>
              <view class="td w-ops ops">
                <text class="op" v-if="o.status === '待付款'" @tap="payForOrder(o)">代收款</text>
                <text class="op" v-if="o.status === '待发货'" @tap="openShip(o)">发货</text>
                <text class="op danger" v-if="o.status !== '已退款' && o.status !== '已完成' && userRole !== 'staff'" @tap="refundOrder(o)">退款</text>
              </view>
            </view>
          </view>
        </view>

        <!-- ===== 用户管理 ===== -->
        <view v-else-if="activeModule === 'users'" class="module">
          <view class="module-head">
            <text class="module-title">用户管理（{{ usersFiltered.length }}）</text>
          </view>
          <view class="table">
            <view class="tr th">
              <text class="td w-name">昵称</text>
              <text class="td w-no">手机号</text>
              <text class="td w-price">道号</text>
              <text class="td w-price" @tap="vipFilterMenu">{{ vipFilter === '全部' ? 'VIP' : 'VIP' + vipFilter }} ▾</text>
              <text class="td w-status" @tap="roleFilterMenu">{{ { admin: '管理员', staff: '员工', user: '用户', '全部': '角色' }[roleFilter] || '角色' }} ▾</text>
              <text class="td w-ops">操作</text>
            </view>
            <view class="tr" v-for="u in usersFiltered" :key="u._id || u.uid">
              <text class="td w-name">{{ u.nickname }}</text>
              <text class="td w-no">{{ u.phone }}</text>
              <text class="td w-price">{{ u.dao_code || '-' }}</text>
              <text class="td w-price">VIP{{ u.vip_level }}</text>
              <text class="td w-status">{{ { admin: '管理员', staff: '员工', manager: '管理员', user: '用户' }[u.role] || '用户' }}</text>
              <view class="td w-ops ops" v-if="userRole === 'admin'">
                <text class="op" @tap="openAssignId(u)">分配道号</text>
                <text class="op" v-if="u.role === 'staff'" @tap="toggleAdmin(u)">设为管理</text>
                <text class="op danger" v-if="u.role === 'manager'" @tap="toggleAdmin(u)">取消管理</text>
              </view>
            </view>
          </view>
        </view>

        <!-- ===== 直播管理 ===== -->
        <view v-else-if="activeModule === 'lives'" class="module">
          <view class="module-head">
            <text class="module-title">直播管理（{{ lives.length }}）</text>
            <view class="btn-p sm" @click="openLiveForm()">＋ 新增直播</view>
          </view>
          <view class="table">
            <view class="tr th">
              <text class="td w-name">标题</text>
              <text class="td w-name">主播</text>
              <text class="td w-time">开始时间</text>
              <text class="td w-status">状态</text>
              <text class="td w-ops">操作</text>
            </view>
            <view class="tr" v-for="l in lives" :key="l.id">
              <text class="td w-name ellipsis">{{ l.title }}</text>
              <text class="td w-name">{{ l.anchor }}</text>
              <text class="td w-time">{{ l.start_time || '-' }}</text>
              <text class="td w-status" :class="'ls-' + l.status">{{ { live: '直播中', upcoming: '未开始', ended: '已结束' }[l.status] || l.status }}</text>
              <view class="td w-ops ops">
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
          <view class="table">
            <view class="tr th">
              <text class="td w-name">作者</text>
              <text class="td w-name">内容</text>
              <text class="td w-time">时间</text>
              <text class="td w-status">推荐</text>
              <text class="td w-ops">操作</text>
            </view>
            <view class="tr" v-for="m in moments" :key="m._id || m.id">
              <text class="td w-name">{{ m.user_name }}</text>
              <text class="td w-name ellipsis">{{ m.content }}</text>
              <text class="td w-time">{{ m.created_at || '-' }}</text>
              <text class="td w-status" :class="m.is_recommended ? 'on' : 'off'">{{ m.is_recommended ? '已推荐' : '未推荐' }}</text>
              <view class="td w-ops ops">
                <text class="op" @tap="auditMoment(m)">{{ m.is_recommended ? '取消推荐' : '推荐' }}</text>
                <text class="op danger" @tap="deleteMoment(m)">删除</text>
              </view>
            </view>
          </view>
        </view>

        <!-- ===== 优惠券管理 ===== -->
        <view v-else-if="activeModule === 'coupons'" class="module">
          <view class="module-head">
            <text class="module-title">优惠券管理（{{ coupons.length }}）</text>
            <view class="btn-p sm" @click="openCouponForm()">＋ 新增优惠券</view>
          </view>
          <view class="table">
            <view class="tr th">
              <text class="td w-name">名称</text>
              <text class="td w-price">优惠</text>
              <text class="td w-stock">有效期</text>
              <text class="td w-status">状态</text>
              <text class="td w-ops">操作</text>
            </view>
            <view class="tr" v-for="c in coupons" :key="c.id">
              <text class="td w-name">{{ c.name }}</text>
              <text class="td w-price" style="color:#8c5a2b">{{ c.discount }}</text>
              <text class="td w-stock">{{ c.expire_at }}</text>
              <text class="td w-status">{{ c.status === 'valid' ? '有效' : '失效' }}</text>
              <view class="td w-ops ops">
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
              <text class="td w-ops">操作</text>
            </view>
            <view class="tr" v-for="f in feedbacks" :key="f.id">
              <text class="td w-no ellipsis">{{ f.nickname || ('UID ' + f.uid) }} {{ f.dao_code ? '(' + f.dao_code + ')' : '' }}</text>
              <text class="td w-name ellipsis">{{ f.content }}</text>
              <text class="td w-time">{{ f.created_at }}</text>
              <text class="td w-status" :class="f.status === '待处理' ? 'st-wait' : 'st-done'">{{ f.status }}</text>
              <view class="td w-ops ops">
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
                <input
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
              <view class="btn-p sm" @click="saveSettings">{{ settingsSaving ? '保存中...' : '保存配置' }}</view>
            </view>
          </view>

          <!-- ===== 小程序接管 (独立板块, 在"小程序"tab 后) ===== -->
          <view class="settings-card" v-else>
            <view class="settings-desc">
              <text class="sd-title">小程序接管（{{ wxmpList.length }}）</text>
              <text class="sd-text">已接管小程序（{{ wxmpList.length }}）：填 AppID → 生成授权链接 → 管理员扫码 → 自动接管（上传开发版 / 体验码 / 提审 / 发布）</text>
            </view>
            <view class="f-row">
              <text class="f-label">绑定小程序</text>
              <view class="f-input-wrap"><view class="btn-p sm" @click="openWxmpBind"><text>＋ 绑定小程序</text></view></view>
            </view>
            <view class="table" v-if="wxmpList.length" style="margin-top: 16rpx">
              <view class="tr th">
                <text class="td w-no">小程序</text>
                <text class="td w-name">AppID</text>
                <text class="td w-time">绑定时间</text>
                <text class="td w-status">状态</text>
                <text class="td w-ops">操作</text>
              </view>
              <view class="tr" v-for="m in wxmpList" :key="m.appid">
                <text class="td w-no ellipsis">{{ m.nickname || m.appid }}</text>
                <text class="td w-name ellipsis">{{ m.appid }}</text>
                <text class="td w-time">{{ m.bound_at }}</text>
                <text class="td w-status" :class="m.status === 'authorized' ? 'st-done' : 'st-wait'">{{ m.status === 'authorized' ? '已接管' : '已取消' }}</text>
                <view class="td w-ops ops">
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
            <textarea class="f-textarea" v-model="productForm.imagesText" placeholder="多个图片用逗号分隔，或点下方上传"></textarea>
            <view class="f-img-row">
              <view class="f-img-item" v-for="(u, ui) in productImages" :key="ui">
                <image class="f-img-thumb" :src="u" mode="aspectFill"></image>
                <text class="f-img-del" @tap="removeProductImg(ui)">✕</text>
              </view>
              <view class="f-img-add" @tap="uploadProductImg">＋ 上传图片</view>
            </view>
          </view>
        </view>
        <view class="f-row"><text class="f-label">描述</text><textarea class="f-textarea" v-model="productForm.description" /></view>
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
    <view class="pp-mask" v-if="showCourse" @tap="showCourse = false"><view class="pp-sheet" @tap.stop>
      <view class="form-sheet">
        <view class="sheet-title">{{ courseForm.id ? '编辑课程' : '新增课程' }}</view>
        <view class="f-row"><text class="f-label">标题</text><input class="f-input" v-model="courseForm.title" /></view>
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
        <view class="f-row"><text class="f-label">分类ID</text><input class="f-input" type="number" v-model="courseForm.category_id" /></view>
        <view class="f-row"><text class="f-label">课时</text><input class="f-input" type="number" v-model="courseForm.lessons_count" /></view>
        <view class="f-row">
          <text class="f-label">等级</text>
          <view class="f-pills">
            <text v-for="lv in ['入门', '进阶', '高级']" :key="lv" class="pill" :class="{ on: courseForm.level === lv }" @tap="courseForm.level = lv">{{ lv }}</text>
          </view>
        </view>
        <view class="f-row"><text class="f-label">描述</text><textarea class="f-textarea" v-model="courseForm.description" /></view>
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
        <view class="f-row"><text class="f-label">主播</text><input class="f-input" v-model="liveForm.anchor" /></view>
        <view class="f-row"><text class="f-label">开始时间</text><input class="f-input" v-model="liveForm.start_time" placeholder="2026-08-05 20:00" /></view>
        <view class="f-row">
          <text class="f-label">状态</text>
          <view class="f-pills">
            <text v-for="st in ['upcoming', 'live', 'ended']" :key="st" class="pill" :class="{ on: liveForm.status === st }" @tap="liveForm.status = st">{{ { upcoming: '未开始', live: '直播中', ended: '已结束' }[st] }}</text>
          </view>
        </view>
        <view class="f-row"><text class="f-label">描述</text><textarea class="f-textarea" v-model="liveForm.description" /></view>
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

    <!-- ===== 分配道号弹窗 ===== -->
    <view class="pp-mask" v-if="showAssignId" @tap="showAssignId = false"><view class="pp-sheet" @tap.stop>
      <view class="form-sheet">
        <view class="sheet-title">分配道号 / 角色</view>
        <view class="f-row"><text class="f-label">道号ID</text><input class="f-input" v-model="assignForm.dao_code" placeholder="如 ZHS00002 / ZHSM002" /></view>
        <view class="f-row">
          <text class="f-label">角色</text>
          <view class="f-pills wrap">
            <text
              v-for="r in roleOptions"
              :key="r.value"
              class="pill"
              :class="{ on: assignForm.role === r.value }"
              @tap="assignForm.role = r.value"
            >{{ r.label }}</text>
          </view>
        </view>
        <view class="sheet-actions">
          <view class="btn-p plain sm" @click="showAssignId = false">取消</view>
          <view class="btn-p sm" @click="saveAssignId">确认分配</view>
        </view>
      </view>
    </view></view>

    <!-- ===== 反馈回复弹窗 ===== -->
    <view class="pp-mask" v-if="showFeedbackReply" @tap="showFeedbackReply = false"><view class="pp-sheet" @tap.stop>
      <view class="form-sheet">
        <view class="sheet-title">回复反馈</view>
        <view class="f-row"><text class="f-label">回复内容</text><textarea class="f-textarea" v-model="replyForm.reply" placeholder="填写回复内容，反馈将标记为已处理" /></view>
        <view class="sheet-actions">
          <view class="btn-p plain sm" @click="showFeedbackReply = false">取消</view>
          <view class="btn-p sm" @click="saveFeedbackReply">确认回复</view>
        </view>
      </view>
    </view></view>

    <!-- ===== 分类编辑弹窗 ===== -->
    <view class="pp-mask" v-if="showCate" @tap="showCate = false"><view class="pp-sheet" @tap.stop>
      <view class="form-sheet">
        <view class="sheet-title">{{ cateForm.id ? '编辑分类' : '新建分类' }}</view>
        <view class="f-row"><text class="f-label">分类名称</text><input class="f-input" v-model="cateForm.name" /></view>
        <view class="f-row"><text class="f-label">描述</text><textarea class="f-textarea" v-model="cateForm.description" /></view>
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
const ST_CLS = {'待付款':'unpaid','待发货':'unshipped','待收货':'unreceived','已完成':'done','已退款':'refunded','全部':'all'}
const stCls = (v) => ST_CLS[v] || v

import { ref, computed, onMounted } from 'vue'
import {
  adminDashboard, adminList, adminProductCreate, adminProductUpdate, adminProductDelete,
  adminCourseCreate, adminCourseUpdate, adminOrderShip, adminOrderRefund,
  adminUserUpdate, adminLiveCreate, adminLiveUpdate, adminMomentAudit, adminMomentDelete,
  adminCouponCreate, adminCouponUpdate, adminCouponDelete, adminRecentOrders,
  adminSettingsGet, adminSettingsSave,
  adminCateList, adminCateCreate, adminCateUpdate, adminCateDelete, adminLogisticsList,
  adminFeedbacksList, adminFeedbackReply, adminFeedbackDelete,
  wxmpGetAuthUrl, wxmpListBound, wxmpGetExperienceQr, wxmpUploadCode, wxmpSubmitAudit, wxmpRelease,
} from '../../api/api'
import { useUserStore } from '../../store/index'
import { getStorage } from '../../api/cloudbase'

const userStore = useUserStore()

const modules = [
  { key: 'overview', label: '数据概览', icon: '📊' },
  { key: 'products', label: '商品管理', icon: '🛍' },
  { key: 'courses', label: '课程管理', icon: '📚' },
  { key: 'orders', label: '订单管理', icon: '📦' },
  { key: 'coupons', label: '优惠券', icon: '🎟' },
  { key: 'users', label: '用户管理', icon: '👥' },
  { key: 'lives', label: '直播管理', icon: '📡' },
  { key: 'moments', label: '动态管理', icon: '📝' },
  { key: 'feedbacks', label: '反馈管理', icon: '💬' },
  { key: 'settings', label: '系统设置', icon: '⚙️' },
]
// 员工权限: 仅概览/商品/课程/订单/直播
const STAFF_MODULES = ['overview', 'products', 'courses', 'orders', 'lives']
const userRole = computed(() => userStore.userInfo.role || 'user')
const visibleModules = computed(() => {
  if (userRole.value === 'staff' || userRole.value === 'manager') {
    return modules.filter((m) => STAFF_MODULES.includes(m.key))
  }
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
const usersFiltered = computed(() => {
  return users.value.filter((u) => {
    if (vipFilter.value !== '全部' && String(u.vip_level) !== vipFilter.value) return false
    if (roleFilter.value !== '全部' && (u.role || 'user') !== roleFilter.value) return false
    return true
  })
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
    itemList: ['全部', '管理员', '受限管理员', '员工', '用户'],
    success: (r) => {
      roleFilter.value = ['全部', 'admin', 'manager', 'staff', 'user'][r.tapIndex]
    },
  })
}
const lives = ref([])
const moments = ref([])
const coupons = ref([])
const orderStatuses = ['全部', '待付款', '待发货', '待收货', '已完成', '已退款']
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

async function loadCourseCates() {
  const cats = await adminCateList({ type: 'courses' })
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
      const [s, r] = await Promise.all([adminDashboard(), adminRecentOrders({ limit: 5 })])
      stats.value = s
      recentOrders.value = r
    } else if (key === 'products') await loadProductCates()
    else if (key === 'courses') await loadCourseCates()
    else if (key === 'orders') await loadOrders()
    else if (key === 'users') users.value = await adminList({ collection: 'users' })
    else if (key === 'lives') lives.value = await adminList({ collection: 'live_streams' })
    else if (key === 'moments') moments.value = await adminList({ collection: 'moments' })
    else if (key === 'coupons') coupons.value = await adminList({ collection: 'coupons' })
    else if (key === 'wxmp') await loadWxmp()
    else if (key === 'feedbacks') await loadFeedbacks()
    else if (key === 'settings') await loadSettings(activeSettingsTab.value)
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  }
}

async function loadOrders() {
  orders.value = await adminList({ collection: 'orders', status: orderFilter.value })
}

/* 反馈管理 */
const feedbacks = ref([])
const showFeedbackReply = ref(false)
const replyForm = ref({ id: null, reply: '' })

async function loadFeedbacks() {
  feedbacks.value = await adminFeedbacksList()
}

function openFeedbackReply(f) {
  replyForm.value = { id: f.id, reply: f.reply || '' }
  showFeedbackReply.value = true
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
        uni.showToast({ title: e.message || '上传失败', icon: 'none' })
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
    confirmColor: '#b04a45',
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
const assignForm = ref({ uid: null, dao_code: '', role: 'user' })
const roleOptions = [
  { value: 'user', label: '普通用户' },
  { value: 'staff', label: '内部员工' },
  { value: 'admin', label: '管理员' },
]

function openAssignId(u) {
  assignForm.value = { uid: u.uid, dao_code: u.dao_code || '', role: u.role || 'user' }
  showAssignId.value = true
}

async function saveAssignId() {
  if (!assignForm.value.dao_code.trim()) {
    uni.showToast({ title: '请输入道号ID', icon: 'none' })
    return
  }
  // 道号修改双重确认
  uni.showModal({
    title: '确认修改道号',
    content: '确定将道号修改为 ' + String(assignForm.value.dao_code).trim().toUpperCase() + ' 吗？',
    success: (r1) => {
      if (!r1.confirm) return
      uni.showModal({
        title: '再次确认',
        content: '道号是用户唯一身份标识，修改后不可自动恢复，请再次确认！',
        success: (r2) => {
          if (!r2.confirm) return
          doSaveAssignId()
        },
      })
    },
  })
}

async function doSaveAssignId() {
  try {
    await adminUserUpdate({
      uid: assignForm.value.uid,
      dao_code: String(assignForm.value.dao_code).trim().toUpperCase(),
      role: assignForm.value.role,
    })
    showAssignId.value = false
    uni.showToast({ title: '已分配', icon: 'success' })
    users.value = await adminList({ collection: 'users' })
  } catch (e) {
    uni.showToast({ title: e.message || '分配失败', icon: 'none' })
  }
}

function goFront() {
  uni.switchTab({ url: '/pages/index/index' })
}

/* 旋转屏幕: 管理后台横屏完整显示 (Capacitor App / H5) */
let isLandscape = false
function rotateScreen() {
  const target = isLandscape ? 'portrait' : 'landscape'
  // Capacitor App 环境
  if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.ScreenOrientation) {
    window.Capacitor.Plugins.ScreenOrientation.lock({ orientation: target }).then(() => {
      isLandscape = !isLandscape
    }).catch(() => {
      uni.showToast({ title: '旋转失败，请手动旋转手机', icon: 'none' })
    })
    return
  }
  // H5 原生 API
  try {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock(target).then(() => {
        isLandscape = !isLandscape
      }).catch(() => {
        uni.showToast({ title: '请手动旋转手机横屏', icon: 'none' })
      })
    } else {
      uni.showToast({ title: '请手动旋转手机横屏', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '请手动旋转手机横屏', icon: 'none' })
  }
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
          .replace(/^cloud:\/\/[^\/]+\//, 'https://7a68-cloud1-d8gs2k9m311f7272f-1464523137.tcb.qcloud.la/')
        courseForm.value.cover = url
        uni.showToast({ title: '封面已上传', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '上传失败', icon: 'none' })
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
          .replace(/^cloud:\/\/[^/]+\//, 'https://7a68-cloud1-d8gs2k9m311f7272f-1464523137.tcb.qcloud.la/')
        const arr = (productForm.value.imagesText || '').split(',').map((s) => s.trim()).filter(Boolean)
        arr.push(url)
        productForm.value.imagesText = arr.join(',')
        uni.showToast({ title: '已上传', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '上传失败', icon: 'none' })
      } finally {
        uni.hideLoading()
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
  courseForm.value = c
    ? { ...c }
    : { id: null, title: '', teacher: '', price: '0.00', ot_price: '', cover: '', category_id: courseActiveCate.value || 1, lessons_count: 0, level: '入门', description: '' }
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
  liveForm.value = l ? { ...l } : { id: null, title: '', anchor: '', start_time: '', status: 'upcoming', description: '' }
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
  uni.showToast({ title: m.is_recommended ? '已取消推荐' : '已推荐', icon: 'none' })
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
    group: 'sms', label: '短信配置', desc: '验证码与通知短信发送服务',
    fields: [
      { key: 'provider', label: '服务商', placeholder: '腾讯云短信 / 阿里云短信' },
      { key: 'secret_id', label: 'SecretId', secret: true },
      { key: 'secret_key', label: 'SecretKey', secret: true },
      { key: 'sign', label: '短信签名', placeholder: '如: 真和盛' },
      { key: 'template_id', label: '验证码模板ID' },
      { key: 'region', label: '区域', placeholder: 'ap-guangzhou' },
    ],
  },
  {
    group: 'oss', label: 'OSS 存储', desc: '对象存储，用于图片/文件上传',
    fields: [
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
    group: 'wxmp', label: '小程序接管', desc: '微信第三方平台扫码授权（上传开发版 / 体验码 / 提审 / 发布）', fields: [],
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
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  } finally {
    settingsSaving.value = false
  }
}

function clearSettingsSecret(f) {
  settingsForm.value[f.key] = ''
}

onMounted(async () => {
  if (!userStore.isLoggedIn || (userStore.userInfo.role !== 'admin' && userStore.userInfo.role !== 'staff')) {
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
  background: #faf3e9;
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
  background: #4e3420;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.logo-area {
  padding: 32rpx 12rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-bottom: 1rpx solid rgba(201, 169, 106, 0.2);
}
.logo-seal {
  width: 72rpx;
  height: 72rpx;
  border: 2rpx solid #c4a484;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 106, 0.12);
  margin-bottom: 16rpx;
}
.logo-seal text {
  font-size: 40rpx;
  color: #c4a484;
}
.logo-name {
  font-size: 28rpx;
  color: #857563;
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
  color: #c4a484;
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
  background: #c4a484;
  color: #4e3420;
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
  color: #857563;
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
  background: #fefbf6;
  border-bottom: 1rpx solid #efe7d8;
}
.tb-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #4e3420;
}
.tb-actions {
  display: flex;
  gap: 32rpx;
}
.tb-link {
  font-size: 24rpx;
  color: #8c5a2b;
  white-space: nowrap;
}
.tb-link.danger {
  color: #b04a45;
}

.content {
  flex: 1;
  padding: 30rpx 40rpx;
}
.module-head {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}
.module-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #4e3420;
}
.filter-pills {
  display: flex;
  margin-left: auto;
}
.pill {
  padding: 8rpx 24rpx;
  margin-left: 12rpx;
  border-radius: 999rpx;
  background: #efe7d8;
  font-size: 22rpx;
  color: #857563;
  white-space: nowrap;
  flex-shrink: 0;
}
.pill.on {
  background: #8c5a2b;
  color: #fefbf6;
}

/* 概览 */
.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.stat-card {
  background: #fefbf6;
  border-radius: 14rpx;
  border: 1rpx solid #efe7d8;
  padding: 22rpx 14rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2rpx 10rpx rgba(69, 26, 3, 0.04);
}
.stat-num {
  font-size: 36rpx;
  font-weight: 500;
  color: #8c5a2b;
}
.stat-label {
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #857563;
}

.recent-panel {
  margin-top: 30rpx;
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  overflow: hidden;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 30rpx;
  border-bottom: 1rpx solid #efe7d8;
}
.panel-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #42372c;
}
.panel-more {
  font-size: 22rpx;
  color: #8c5a2b;
}
.recent-row {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #efe7d8;
  gap: 20rpx;
}
.recent-row:last-child {
  border-bottom: none;
}
.rr-no {
  width: 300rpx;
  font-size: 20rpx;
  color: #857563;
}
.rr-items {
  flex: 1;
  font-size: 24rpx;
  color: #42372c;
}
.rr-price {
  width: 120rpx;
  text-align: right;
  font-size: 24rpx;
  color: #b04a45;
}
.rr-status {
  width: 100rpx;
  text-align: center;
  font-size: 22rpx;
  color: #8c5a2b;
}
.recent-empty {
  text-align: center;
  color: #b3a595;
  font-size: 24rpx;
  padding: 40rpx;
}

/* 表格 */
.table {
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.tr {
  display: flex;
  align-items: center;
  padding: 18rpx 24rpx;
  border-bottom: 1rpx solid #efe7d8;
  /* 手机端表格超宽时横向滑动, 显示更规整 */
  min-width: 1080rpx;
}
.tr:last-child {
  border-bottom: none;
}
.tr.th {
  background: #faf3e9;
}
.th .td {
  font-weight: 500;
  color: #4e3420;
  font-size: 24rpx;
}
.td {
  font-size: 24rpx;
  color: #42372c;
}
.w-img { width: 76rpx; }
.w-name { flex: 2; padding: 0 10rpx; min-width: 0; }
.w-price { width: 120rpx; }
.w-stock { width: 130rpx; text-align: center; }
.w-no { width: 280rpx; font-size: 20rpx; }
.w-status { width: 110rpx; text-align: center; }
.w-ops { width: 340rpx; display: flex; align-items: center; flex-wrap: nowrap; gap: 8rpx; }
.thumb {
  width: 60rpx;
  height: 60rpx;
  border-radius: 8rpx;
  background: #faf3e9;
}
.op {
  font-size: 22rpx;
  color: #8c5a2b;
  padding: 4rpx 10rpx;
  white-space: nowrap;
  flex-shrink: 0;
}
.op.danger {
  color: #b04a45;
}
.on { color: #6e7f5a; }
.off { color: #b04a45; }
.ls-live { color: #b04a45; }
.ls-upcoming { color: #8c5a2b; }
.ls-ended { color: #857563; }
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
  background: #efe7d8;
  font-size: 26rpx;
  color: #857563;
}
.settings-tab.on {
  background: #8c5a2b;
  color: #fefbf6;
  font-weight: 500;
}
.cover-preview {
  width: 140rpx;
  height: 90rpx;
  border-radius: 8rpx;
  border: 1rpx solid #efe7d8;
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
  color: #857563;
  margin-right: 6rpx;
}
.filter-pill {
  font-size: 22rpx;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: #f8f3ea;
  color: #857563;
}
.filter-pill.on {
  background: #8c5a2b;
  color: #fefbf6;
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
  color: #857563;
  margin-right: 6rpx;
}
.filter-pill {
  font-size: 22rpx;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: #f8f3ea;
  color: #857563;
}
.filter-pill.on {
  background: #8c5a2b;
  color: #fefbf6;
}
.settings-card {
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
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
  border-bottom: 1rpx solid #efe7d8;
}
.sd-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #4e3420;
  margin-right: 20rpx;
}
.sd-text {
  font-size: 22rpx;
  color: #857563;
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
  color: #b04a45;
  padding: 8rpx;
}
.settings-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 30rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #efe7d8;
}
.settings-tip {
  font-size: 20rpx;
  color: #b3a595;
  flex: 1;
  margin-right: 20rpx;
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
  background: #fefbf6;
  border-radius: 16rpx;
  border: 1rpx solid #efe7d8;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}
.cate-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #efe7d8;
}
.cate-panel-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #4e3420;
}
.cate-add {
  font-size: 22rpx;
  color: #8c5a2b;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: #f8f3ea;
}
.cate-panel-list {
  flex: 1;
  max-height: 520px;
}
.cate-row {
  display: flex;
  align-items: center;
  padding: 18rpx 20rpx;
  border-bottom: 1rpx solid #efe7d8;
  gap: 8rpx;
}
.cate-row.active {
  background: #f8f3ea;
}
.cate-row-name {
  flex: 1;
  min-width: 0;
  font-size: 24rpx;
  color: #42372c;
}
.cate-row.active .cate-row-name {
  color: #8c5a2b;
  font-weight: 500;
}
.cate-row-badge {
  font-size: 18rpx;
  color: #6e7f5a;
  background: #faf3e9;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
}
.cate-row-badge.off {
  color: #b04a45;
  background: #faf3e9;
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
  color: #8c5a2b;
  background: #f8f3ea;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
}
.cate-op.danger {
  color: #b04a45;
}
.cate-main {
  flex: 1;
  min-width: 0;
}
.table-empty {
  text-align: center;
  color: #b3a595;
  font-size: 24rpx;
  padding: 60rpx 0;
}

/* 属性编辑器 */
.attr-editor {
  margin-bottom: 20rpx;
  padding: 20rpx;
  background: #f8f3ea;
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
  color: #42372c;
}
.attr-add {
  font-size: 22rpx;
  color: #8c5a2b;
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
  background: #fefbf6;
  border-radius: 10rpx;
  padding: 0 18rpx;
  font-size: 24rpx;
  color: #42372c;
  border: 1rpx solid #efe7d8;
}
.attr-del {
  font-size: 24rpx;
  color: #b04a45;
  padding: 8rpx 10rpx;
}
.attr-empty {
  text-align: center;
  font-size: 22rpx;
  color: #b3a595;
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
  background: #f8f3ea;
  font-size: 24rpx;
  color: #857563;
  border: 2rpx solid transparent;
}
.f-pills .pill.on {
  color: #8c5a2b;
  border-color: #8c5a2b;
  background: #faf3e9;
  font-weight: 500;
}
.f-static {
  flex: 1;
  font-size: 26rpx;
  color: #42372c;
}
.st-unpaid { color: #b04a45; font-weight: 500; }
.st-wait { color: #ba7517; font-weight: 500; }
.st-done { color: #6e7f5a; font-weight: 500; }
.st-unshipped { color: #8c5a2b; font-weight: 500; }
.st-unreceived { color: #ba7517; font-weight: 500; }
.st-done { color: #6e7f5a; font-weight: 500; }
.st-refunded { color: #857563; font-weight: 500; }
.td-logis {
  display: block;
  font-size: 20rpx;
  color: #b3a595;
  margin-top: 4rpx;
}
/* 时间列: 单行显示 */
.w-time {
  width: 220rpx;
  white-space: nowrap;
  font-size: 22rpx;
  color: #857563;
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
  color: #42372c;
  margin-bottom: 24rpx;
}
.f-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}
.f-label {
  width: 150rpx;
  font-size: 24rpx;
  color: #857563;
  flex-shrink: 0;
}
.f-input {
  flex: 1;
  height: 72rpx;
  background: #f8f3ea;
  border-radius: 10rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  color: #42372c;
}
.f-textarea {
  flex: 1;
  height: 120rpx;
  background: #f8f3ea;
  border-radius: 10rpx;
  padding: 14rpx 20rpx;
  font-size: 26rpx;
  color: #42372c;
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
  background: #b04a45;
  color: #fefbf6;
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
  color: #8c5a2b;
  font-size: 22rpx;
  background: #faf3e9;
}
/* 小程序接管 */
.btn-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 60rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #8c5a2b, #6e4a26);
  padding: 0 28rpx;
  margin-left: auto;
}
.btn-add text { font-size: 24rpx; color: #fefbf6; }
.wxmp-tip { font-size: 22rpx; color: #857563; margin-bottom: 16rpx; line-height: 1.6; }
.wxmp-bind-tip { font-size: 22rpx; color: #b3a595; margin-top: 16rpx; line-height: 1.6; }
.wxmp-strong { color: #b04a45; }
.wxmp-auth { margin-top: 20rpx; background: #faf3e9; border-radius: 12rpx; padding: 18rpx; }
.wxmp-auth-tip { display: block; font-size: 22rpx; color: #857563; margin-bottom: 8rpx; }
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
  background: linear-gradient(135deg, #8c5a2b, #6e4a26);
  margin-top: 14rpx;
}
.btn-copy text { font-size: 24rpx; color: #fefbf6; }
.qr-sheet { text-align: center; }
.wxmp-qr-img { width: 400rpx; margin: 20rpx auto; display: block; }
.wxmp-qr-tip { font-size: 22rpx; color: #b3a595; margin: 30rpx 0; }
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
  .content {
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
}
</style>
