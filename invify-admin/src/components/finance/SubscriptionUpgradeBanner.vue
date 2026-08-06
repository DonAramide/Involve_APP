<template>
  <div class="upgrade-banner">
    <div class="upgrade-content">
      <i class="fas fa-lock upgrade-icon"></i>
      <h2>Unlock Invoice Payments</h2>
      <p>Automate your payment routing, manage virtual accounts, and integrate seamlessly with Quasar. Available on Professional and Enterprise plans.</p>
      <div class="upgrade-actions">
        <button class="btn btn-primary" @click="$emit('upgrade')">Upgrade Plan</button>
        <button class="btn btn-outline" @click="$emit('learn-more')">Learn More</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.upgrade-banner {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-height: 400px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  text-align: center;
  padding: 40px;
}

.upgrade-content {
  max-width: 480px;
}

.upgrade-icon {
  font-size: 48px;
  color: #94a3b8;
  margin-bottom: 24px;
}

h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 16px;
}

p {
  font-size: 16px;
  color: #64748b;
  margin-bottom: 32px;
  line-height: 1.5;
}

.upgrade-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-size: 14px;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-outline {
  background: transparent;
  border: 1px solid #cbd5e1;
  color: #475569;
}
</style>
