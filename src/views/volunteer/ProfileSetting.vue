<template>
  <main class="main-content">
    <div class="top-status">
      <span class="pulse-dot"></span> 账号安全守护中心运行中
    </div>

    <div class="profile-container">
      <header class="page-header">
        <h2 class="title">⚙️ 个人中心与设置</h2>
        <p class="subtitle">管理您的基础资料与安全凭证</p>
      </header>

      <div class="settings-grid" v-loading="loading">
        <div class="setting-card">
          <div class="card-header">
            <h3>📝 基础资料</h3>
          </div>
          <div class="card-body">
            <div class="info-row">
              <label>注册手机号 (不可改)</label>
              <input type="text" :value="profile.phone" disabled class="input-disabled" />
            </div>
            <div class="info-row">
              <label>系统角色</label>
              <div class="role-badge">
                {{ roleNameMap[profile.role] || '加载中...' }}
              </div>
            </div>
            <div class="info-row">
              <label>真实姓名/昵称</label>
              <input type="text" v-model="profileForm.username" placeholder="请输入您的姓名" class="input-normal" />
            </div>
            <button class="save-btn" @click="handleUpdateProfile">保存基础资料</button>
          </div>
        </div>

        <div class="setting-card alert-card">
          <div class="card-header">
            <h3>🔒 安全设置</h3>
          </div>
          <div class="card-body">
            <div class="info-row">
              <label>原密码</label>
              <input type="password" v-model="pwdForm.oldPassword" placeholder="请输入当前使用的密码" class="input-normal" />
            </div>
            <div class="info-row">
              <label>新密码</label>
              <input type="password" v-model="pwdForm.newPassword" placeholder="请输入新密码" class="input-normal" />
            </div>
            <div class="info-row">
              <label>确认新密码</label>
              <input type="password" v-model="pwdForm.confirmPassword" placeholder="请再次输入新密码" class="input-normal" />
            </div>
            <button class="save-btn warning-btn" @click="handleUpdatePassword">确认修改密码</button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getUserProfile, updateUserProfile, updatePassword } from '@/api/user'

const loading = ref(false)
const profile = ref({})

const roleNameMap = {
  1: '👴 受赠用户',
  2: '🏪 合作商家',
  3: '🚴 高级志愿者',
  4: '👨‍💻 系统管理员'
}

const profileForm = reactive({
  username: ''
})

const pwdForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const fetchProfile = async () => {
  loading.value = true
  try {
    const res = await getUserProfile()
    profile.value = res.data
    profileForm.username = res.data.username
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleUpdateProfile = async () => {
  if (!profileForm.username.trim()) return ElMessage.warning('姓名不能为空')
  try {
    await updateUserProfile({ username: profileForm.username })
    ElMessage.success('基础资料更新成功')
    // 同步更新本地缓存，防止刷新后名字变回去
    localStorage.setItem('username', profileForm.username)
    fetchProfile()
  } catch (e) {
    console.error(e)
  }
}

const handleUpdatePassword = async () => {
  if (!pwdForm.oldPassword || !pwdForm.newPassword) return ElMessage.warning('密码填写不完整')
  if (pwdForm.newPassword !== pwdForm.confirmPassword) return ElMessage.warning('两次输入的新密码不一致')
  if (pwdForm.newPassword.length < 6) return ElMessage.warning('新密码长度不能小于6位')

  try {
    await updatePassword({
      oldPassword: pwdForm.oldPassword,
      newPassword: pwdForm.newPassword
    })
    ElMessage.success('密码修改成功，请牢记新密码！')
    pwdForm.oldPassword = ''
    pwdForm.newPassword = ''
    pwdForm.confirmPassword = ''
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  fetchProfile()
})
</script>

<style scoped>
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  padding: 30px;
}

.top-status {
  position: absolute; top: 20px; right: 30px; z-index: 100;
  background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px);
  padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; color: #64748b;
  display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}
.pulse-dot {
  width: 8px; height: 8px; background: #10b981; border-radius: 50%;
  box-shadow: 0 0 8px #10b981; animation: pulse-green 2s infinite;
}
@keyframes pulse-green {
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

.profile-container {
  max-width: 900px;
  width: 100%;
  margin: 20px auto 0;
}

.page-header { margin-bottom: 30px; }
.title { font-size: 1.8rem; color: #1e293b; margin: 0 0 8px 0; font-weight: 900; }
.subtitle { color: #64748b; margin: 0; font-size: 1rem; }

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 25px;
}
@media (max-width: 768px) {
  .settings-grid { grid-template-columns: 1fr; }
}

.setting-card {
  background: #fff;
  border-radius: 20px;
  padding: 25px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.04);
  border: 1px solid #f8fafc;
  display: flex;
  flex-direction: column;
}

.card-header h3 {
  margin: 0 0 20px 0;
  color: #334155;
  font-size: 1.2rem;
  font-weight: 800;
  border-bottom: 2px dashed #f1f5f9;
  padding-bottom: 15px;
}

.info-row {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row label {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: bold;
}

.input-normal, .input-disabled {
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1.5px solid #e2e8f0;
  font-size: 1rem;
  transition: all 0.2s;
  outline: none;
}
.input-normal:focus {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
}

.input-disabled {
  background: #f8fafc;
  color: #94a3b8;
  cursor: not-allowed;
}

.role-badge {
  background: #ecfdf5;
  color: #10b981;
  padding: 12px 16px;
  border-radius: 12px;
  font-weight: 800;
  font-size: 1rem;
  border: 1px solid #d1fae5;
  display: inline-block;
}

.save-btn {
  margin-top: auto;
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: var(--c-primary);
  color: white;
  font-weight: bold;
  font-size: 1.05rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);
}
.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(249, 115, 22, 0.3);
}

.warning-btn {
  background: #fff;
  color: #ef4444;
  border: 2px solid #ef4444;
  box-shadow: none;
}
.warning-btn:hover {
  background: #ef4444;
  color: #fff;
  box-shadow: 0 6px 15px rgba(239, 68, 68, 0.2);
}
</style>