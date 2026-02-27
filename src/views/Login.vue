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
        <p class="brand-sub">让每一份余量，成为他人的能量</p>
      </header>

      <div class="rule"><span></span><i>✦</i><span></span></div>

      <form class="form" @submit.prevent="handleLogin">
        <label class="field">
          <span class="field-icon">📱</span>
          <input v-model="form.phone" type="tel" placeholder="请输入手机号"/>
        </label>

        <label class="field">
          <span class="field-icon">🔒</span>
          <input v-model="form.password" type="password" placeholder="请输入密码" @keyup.enter="handleLogin"/>
        </label>

        <button class="submit-btn" type="submit" :disabled="loading">
          <span class="submit-shine"></span>
          {{ loading ? '连接安全大脑...' : '开启调度之旅' }}
        </button>
      </form>

      <footer class="card-footer">
        <button class="text-btn">志愿者注册</button>
        <span class="dot-sep">·</span>
        <button class="text-btn">忘记密码</button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import {reactive, ref} from 'vue'
import {useRouter} from 'vue-router'
import {login} from '@/api/auth'

const router = useRouter()
const loading = ref(false)
const form = reactive({phone: '13800000000', password: '123456'})

const handleLogin = async () => {
  if (!form.phone || !form.password) return alert('还没填全呢 ~')
  loading.value = true
  try {
    const res = await login(form.phone, form.password)
    localStorage.setItem('ACCESS_TOKEN', res.data)
    router.push('/map')
  } catch (e) {
    console.error('登录失败', e)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrapper {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff8f0;
  overflow: hidden;
}

.bg-layer {
  position: absolute;
  inset: 0;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
}

.b1 {
  width: 600px;
  height: 600px;
  background: #fdba74;
  top: -100px;
  left: -100px;
}

.b2 {
  width: 500px;
  height: 500px;
  background: #fca5a5;
  bottom: -100px;
  right: -100px;
}

.floats span {
  position: absolute;
  left: var(--x);
  top: var(--y);
  font-size: var(--s);
  opacity: 0.3;
  animation: floatBob 6s ease-in-out infinite var(--d);
}

@keyframes floatBob {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-25px);
  }
}

.card {
  position: relative;
  z-index: 10;
  width: 400px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid #fff;
  border-radius: 32px;
  padding: 50px 40px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.08), 0 0 40px rgba(234, 88, 12, 0.05);
  text-align: center;
}

.logo-wrap {
  position: relative;
  width: 90px;
  height: 90px;
  margin: 0 auto 20px;
}

.logo-icon {
  position: relative;
  background: #fff;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.8rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.logo-glow {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: linear-gradient(45deg, #f97316, #fbbf24);
  animation: rotate 4s linear infinite;
}

@keyframes rotate {
  to {
    transform: rotate(360deg);
  }
}

.brand {
  color: #7c2d12;
  font-size: 1.8rem;
  font-weight: 800;
  margin-bottom: 5px;
}

.brand-sub {
  color: #9a3412;
  font-size: 0.85rem;
  opacity: 0.7;
}

.rule {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 25px 0;
  opacity: 0.3;
}

.rule span {
  flex: 1;
  height: 1px;
  background: #9a3412;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

/* 🚨 增加边框可见度 */
.field {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1.5px solid rgba(124, 45, 18, 0.15);
  border-radius: 16px;
  padding: 4px 16px;
  transition: all 0.3s;
}

.field:focus-within {
  border-color: #ea580c;
  box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.1);
}

.field input {
  flex: 1;
  border: none;
  outline: none;
  padding: 12px 0;
  font-size: 1rem;
  color: #431407;
}

.submit-btn {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg, #ea580c, #f97316);
  color: #fff;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 10px 25px rgba(234, 88, 12, 0.3);
  transition: transform 0.2s;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(234, 88, 12, 0.4);
}

.card-footer {
  margin-top: 25px;
  color: #9a3412;
  font-size: 0.85rem;
  opacity: 0.6;
}

.text-btn {
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
}

.text-btn:hover {
  color: #ea580c;
  text-decoration: underline;
}
</style>