<script setup lang="ts">
import { ref } from 'vue'
import ball from './assets/ball.png'
defineEmits<{ policy: [] }>()
const notice = ref('')
const fields = ref({ name: '', email: '', company: '', role: '', consent: false })
function submit() {
  notice.value = 'Регистрация пока не открыта. Данные не отправлены. Следите за обновлениями конференции.'
}
</script>
<template>
  <section id="registration" class="od-registration od-section" aria-labelledby="registration-title">
    <h2 id="registration-title">Отправиться<br><em>в ИТ-одиссею</em></h2>
    <form class="od-form" @submit.prevent="submit">
      <label>Имя и Фамилия*<input v-model="fields.name" name="name" autocomplete="name" required minlength="2" maxlength="120" placeholder="Введите ваше имя"></label>
      <label>Email*<input v-model="fields.email" name="email" type="email" autocomplete="email" required maxlength="180" placeholder="Куда прислать приглашение"></label>
      <label>Компания*<input v-model="fields.company" name="company" autocomplete="organization" required maxlength="160" placeholder="Введите название"></label>
      <label>Должность*<input v-model="fields.role" name="role" autocomplete="organization-title" required maxlength="160" placeholder="Ваша должность"></label>
      <label class="od-form__consent"><input v-model="fields.consent" name="consent" type="checkbox" required><span>Нажимая «Отправить», вы соглашаетесь на обработку указанных персональных данных в соответствии с <button type="button" class="od-inline-link" @click="$emit('policy')">Политикой в отношении обработки персональных данных</button></span></label>
      <div class="od-form__action"><button type="submit" class="od-ribbon">Отправить</button><img :src="ball" alt=""></div>
      <p v-if="notice" class="od-form__notice" role="status">{{ notice }}</p>
    </form>
  </section>
</template>
