<template>
  <div class="login-wrapper">
    <div class="bg-layer">
      <div class="blob b1"></div>
      <div class="blob b2"></div>
      <div class="grain"></div>
    </div>
    <div class="floats">
      <span style="--x:10%; --y:15%; --d:0s; --s:2.5rem">🍞</span>
      <span style="--x:85%; --y:20%; --d:1s; --s:2rem">🍎</span>
      <span style="--x:7%; --y:70%; --d:2s; --s:1.8rem">🥛</span>
      <span style="--x:90%; --y:75%; --d:3s; --s:2.2rem">🥦</span>
      <span style="--x:48%; --y:85%; --d:4s; --s:1.6rem">🧡</span>
    </div>

    <div class="card">
      <header class="card-header">
        <div class="logo-wrap">
          <div class="logo-glow"></div>
          <div class="logo-icon">🏪</div>
        </div>
        <h1 class="brand">社区食物银行</h1>
        <p class="brand-sub">{{ isForgot ? '重置密码，找回您的爱心账户' : (isRegister ? '加入我们，传递城市温情' : '让每一份余量，成为他人的能量') }}</p>
      </header>

      <div class="rule"><span></span><i>✦</i><span></span></div>

      <form class="form" @submit.prevent="handleSubmit">

        <div v-if="isRegister" class="role-group">
          <label class="role-btn" :class="{ active: form.role === 1 }">
            <input type="radio" v-model="form.role" :value="1" hidden /> 👴 求助者
          </label>
          <label class="role-btn" :class="{ active: form.role === 3 }">
            <input type="radio" v-model="form.role" :value="3" hidden /> 🚴 志愿者
          </label>
          <label class="role-btn" :class="{ active: form.role === 2 }">
            <input type="radio" v-model="form.role" :value="2" hidden /> 🏪 爱心商家
          </label>
        </div>

        <div v-if="isRegister" class="dynamic-tip" :class="{ 'warning-tip': form.role === 2 }">
          {{ roleConfig.tip }}
        </div>

        <label v-if="isRegister" class="field">
          <span class="field-icon">{{ roleConfig.icon }}</span>
          <input v-model="form.username" type="text" :placeholder="roleConfig.placeholder" />
        </label>

        <label class="field">
          <span class="field-icon">📱</span>
          <input v-model="form.phone" type="tel" maxlength="11" placeholder="请输入11位手机号"/>
        </label>

        <label v-if="isRegister || isForgot" class="field">
          <span class="field-icon">✉️</span>
          <input v-model="form.smsCode" type="text" maxlength="6" placeholder="请输入短信验证码"/>
          <button type="button" class="sms-btn-inline" :disabled="countdown > 0" @click="handleSendCode">
            {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
          </button>
        </label>

        <label class="field">
          <span class="field-icon">🔒</span>
          <input v-model="form.password" type="password" :placeholder="isForgot ? '请输入新密码' : '请输入密码'" @keyup.enter="handleSubmit"/>
        </label>

        <label v-if="!isRegister && !isForgot" class="field">
          <span class="field-icon">🛡️</span>
          <input v-model="form.captcha" type="text" maxlength="4" placeholder="请输入右侧验证码" @keyup.enter="handleSubmit"/>
          <canvas ref="captchaCanvas" width="90" height="34" class="captcha-canvas-inline" @click="drawCaptcha" title="看不清？点击刷新"></canvas>
        </label>

        <div class="agreement" v-if="isRegister">
          <label class="checkbox-container">
            <input type="checkbox" v-model="form.agree" />
            <span class="checkmark"></span>
            <span class="agree-text">我已阅读并同意 <a href="#" @click.prevent>《服务协议》</a> 与 <a href="#" @click.prevent>《隐私政策》</a></span>
          </label>
        </div>

        <button class="submit-btn" type="submit" :disabled="loading || (isRegister && !form.agree)">
          <span class="submit-shine"></span>
          {{ loading ? '连接安全大脑...' : (isForgot ? '确认重置密码' : (isRegister ? '立即注册' : '开启调度之旅')) }}
        </button>
      </form>

      <footer class="card-footer">
        <template v-if="!isForgot">
          <button class="text-btn" type="button" @click="toggleMode('register')">
            {{ isRegister ? '已有账号？去登录' : '没有账号？快速注册' }}
          </button>
          <span class="dot-sep" v-if="!isRegister">·</span>
          <button class="text-btn" type="button" v-if="!isRegister" @click="toggleMode('forgot')">忘记密码</button>
        </template>
        <template v-else>
          <button class="text-btn" type="button" @click="toggleMode('login')">想起来了？返回登录</button>
        </template>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { login, register, sendSmsCode, resetPassword } from '@/api/auth'
import { ElMessage, ElNotification } from "element-plus"

const router = useRouter()
const loading = ref(false)
const isRegister = ref(false)
const isForgot = ref(false)
const countdown = ref(0)

const captchaCanvas = ref(null)
const generatedCaptcha = ref('')

const form = reactive({ phone: '', password: '', username: '', role: 3, smsCode: '', agree: false, captcha: '' })
const phoneRegex = /^1[3-9]\d{9}$/

// 动态角色配置
const roleConfig = computed(() => {
  switch (form.role) {
    case 1: return { icon: '👴', placeholder: '请输入您的称呼 (如: 张大爷)', tip: '注册后即可一键发布紧急物资求助' };
    case 2: return { icon: '🏪', placeholder: '请输入营业执照上的店铺/企业名称', tip: '⚠️ 商家账号注册后，需等待管理员审核资质后使用' };
    case 3: default: return { icon: '🚴', placeholder: '请输入您的真实姓名 (配送核验用)', tip: '注册即刻成为爱心骑手，参与城市物资配送' };
  }
})

// 绘制前端图形验证码
const drawCaptcha = () => {
  if (!captchaCanvas.value) return;
  const ctx = captchaCanvas.value.getContext('2d');

  // 🚨 这里的长宽和 HTML 里的一致
  const width = 90;
  const height = 34;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  generatedCaptcha.value = code;

  ctx.font = 'bold 22px Arial';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < code.length; i++) {
    ctx.fillStyle = `rgb(${Math.floor(Math.random()*150)},${Math.floor(Math.random()*150)},${Math.floor(Math.random()*150)})`;
    ctx.save();
    ctx.translate(18 * i + 15, 17);
    ctx.rotate((Math.random() - 0.5) * 0.5);
    ctx.fillText(code[i], -10, 0);
    ctx.restore();
  }

  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(${Math.random()*255},${Math.random()*255},${Math.random()*255}, 0.5)`;
    ctx.beginPath();
    ctx.moveTo(Math.random() * width, Math.random() * height);
    ctx.lineTo(Math.random() * width, Math.random() * height);
    ctx.stroke();
  }

  for(let i=0; i<30; i++) {
    ctx.fillStyle = `rgba(${Math.random()*255},${Math.random()*255},${Math.random()*255}, 0.6)`;
    ctx.beginPath();
    ctx.arc(Math.random()*width, Math.random()*height, 1.5, 0, 2*Math.PI);
    ctx.fill();
  }
}

// 模式切换
const toggleMode = async (mode) => {
  isRegister.value = (mode === 'register' && !isRegister.value);
  isForgot.value = (mode === 'forgot');
  form.phone = ''; form.password = ''; form.username = ''; form.smsCode = ''; form.role = 3; form.captcha = ''; countdown.value = 0;

  if (!isRegister.value && !isForgot.value) {
    await nextTick()
    drawCaptcha()
  }
}

// 获取验证码
const handleSendCode = async () => {
  if (!phoneRegex.test(form.phone)) return ElMessage.warning('请输入正确的 11 位手机号码')
  try {
    const res = await sendSmsCode(form.phone)
    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) clearInterval(timer)
    }, 1000)

    ElNotification({
      title: '💬 新信息',
      message: `【暖心食光】验证码为 <b>${res.data}</b>，5分钟内有效。打死不要告诉别人！`,
      dangerouslyUseHTMLString: true, type: 'info', duration: 15000, position: 'top-right',
    })
  } catch (e) { console.error('发送失败', e) }
}

// 统一提交
const handleSubmit = async () => {
  if (isRegister.value && !form.agree) return ElMessage.warning('请先勾选同意服务协议')
  if (!phoneRegex.test(form.phone)) return ElMessage.warning('手机号码格式不正确')
  if (!form.password) return ElMessage.warning('请输入密码')

  if ((isRegister.value || isForgot.value) && !form.smsCode) return ElMessage.warning('请输入短信验证码')
  if (isRegister.value && !form.username) return ElMessage.warning('请将名称填写完整')

  if (!isRegister.value && !isForgot.value) {
    if (!form.captcha) return ElMessage.warning('请输入图形验证码')
    if (form.captcha.toLowerCase() !== generatedCaptcha.value.toLowerCase()) {
      drawCaptcha()
      form.captcha = ''
      return ElMessage.error('验证码错误，请重新输入')
    }
  }

  loading.value = true
  try {
    if (isForgot.value) {
      await resetPassword(form.phone, form.smsCode, form.password)
      ElMessage.success('密码重置成功，请登录！')
      toggleMode('login')
    } else if (isRegister.value) {
      await register({ phone: form.phone, password: form.password, username: form.username, role: form.role, smsCode: form.smsCode })
      ElMessage.success('注册成功！请登录')
      toggleMode('login')
    } else {
      const res = await login(form.phone, form.password)
      localStorage.setItem('ACCESS_TOKEN', res.data.token)
      localStorage.setItem('userRole', res.data.role.toString())
      localStorage.setItem('username', res.data.username)
      ElMessage.success('登录成功，欢迎回来')
      await router.push('/map')
    }
  } catch (e) {
    console.error('操作失败', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  drawCaptcha()
})
</script>

<style scoped>
/* =========== 基础卡片样式 =========== */
.login-wrapper { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: #fff8f0; overflow: hidden; }
.bg-layer { position: absolute; inset: 0; }
.blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5; }
.b1 { width: 600px; height: 600px; background: #fdba74; top: -100px; left: -100px; }
.b2 { width: 500px; height: 500px; background: #fca5a5; bottom: -100px; right: -100px; }
.floats span { position: absolute; left: var(--x); top: var(--y); font-size: var(--s); opacity: 0.3; animation: floatBob 6s ease-in-out infinite var(--d); }
@keyframes floatBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-25px); } }

.card { position: relative; z-index: 10; width: 420px; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px); border: 1px solid #fff; border-radius: 32px; padding: 40px 40px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.08), 0 0 40px rgba(234, 88, 12, 0.05); text-align: center; transition: all 0.3s ease; }
.logo-wrap { position: relative; width: 80px; height: 80px; margin: 0 auto 15px; }
.logo-icon { position: relative; background: #fff; width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); }
.logo-glow { position: absolute; inset: -4px; border-radius: 50%; background: linear-gradient(45deg, #f97316, #fbbf24); animation: rotate 4s linear infinite; }
@keyframes rotate { to { transform: rotate(360deg); } }
.brand { color: #7c2d12; font-size: 1.6rem; font-weight: 800; margin-bottom: 5px; }
.brand-sub { color: #9a3412; font-size: 0.85rem; opacity: 0.7; }
.rule { display: flex; align-items: center; gap: 10px; margin: 20px 0; opacity: 0.3; }
.rule span { flex: 1; height: 1px; background: #9a3412; }

/* =========== 表单与控件样式 =========== */
.form { display: flex; flex-direction: column; gap: 12px; }

/* 🚨 内嵌式大边框布局核心 */
.field { display: flex; align-items: center; gap: 12px; background: #fff; border: 1.5px solid rgba(124, 45, 18, 0.15); border-radius: 16px; padding: 4px 16px; transition: all 0.3s; }
.field:focus-within { border-color: #ea580c; box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.1); }
.field input { flex: 1; border: none; outline: none; padding: 12px 0; font-size: 1rem; color: #431407; background: transparent; min-width: 0; }

.role-group { display: flex; gap: 10px; background: #f8fafc; padding: 6px; border-radius: 14px; border: 1px solid rgba(124, 45, 18, 0.08); margin-bottom: 5px; }
.role-btn { flex: 1; padding: 8px 0; font-size: 0.8rem; color: #64748b; font-weight: bold; text-align: center; border-radius: 10px; cursor: pointer; transition: all 0.3s; user-select: none; }
.role-btn.active { background: #fff; color: #ea580c; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }

.dynamic-tip { font-size: 0.75rem; color: #10b981; background: #ecfdf5; padding: 6px 10px; border-radius: 8px; margin-bottom: 5px; font-weight: bold; text-align: left; animation: fadeIn 0.3s ease; }
.warning-tip { color: #ea580c; background: #fff7ed; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

/* 🚀 内嵌式短信按钮 */
.sms-btn-inline { padding: 6px 12px; border: none; background: #ffedd5; color: #ea580c; font-weight: bold; font-size: 0.8rem; border-radius: 8px; cursor: pointer; transition: 0.3s; white-space: nowrap; }
.sms-btn-inline:hover:not(:disabled) { background: #fed7aa; }
.sms-btn-inline:disabled { color: #9ca3af; background: #f3f4f6; cursor: not-allowed; }

/* 🚀 内嵌式图形验证码 */
.captcha-canvas-inline { border-radius: 8px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition: transform 0.2s; margin-right: -4px; }
.captcha-canvas-inline:hover { transform: scale(1.05); }

.agreement { text-align: left; margin: 5px 0 5px 5px; }
.checkbox-container { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.75rem; color: #64748b; }
.checkbox-container input { display: none; }
.checkmark { width: 16px; height: 16px; border: 1.5px solid #cbd5e1; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; transition: 0.2s; }
.checkbox-container input:checked + .checkmark { background: #f97316; border-color: #f97316; }
.checkbox-container input:checked + .checkmark::after { content: '✓'; color: #fff; font-size: 12px; font-weight: bold; }
.agree-text a { color: #ea580c; text-decoration: none; font-weight: bold; }
.agree-text a:hover { text-decoration: underline; }

.submit-btn { width: 100%; padding: 16px; border: none; border-radius: 16px; background: linear-gradient(135deg, #ea580c, #f97316); color: #fff; font-size: 1.1rem; font-weight: bold; cursor: pointer; box-shadow: 0 10px 25px rgba(234, 88, 12, 0.3); transition: transform 0.2s; margin-top: 5px; }
.submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(234, 88, 12, 0.4); }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; background: #94a3b8; box-shadow: none; }

.card-footer { margin-top: 20px; color: #9a3412; font-size: 0.85rem; opacity: 0.6; display: flex; align-items: center; justify-content: center; gap: 10px; }
.text-btn { border: none; background: none; color: inherit; cursor: pointer; transition: 0.2s; }
.text-btn:hover { color: #ea580c; text-decoration: underline; }
</style>