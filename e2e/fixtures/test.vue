<template>
  <div>
    <h1>{{ t('Hello World') }}</h1>
    <p>{{ t("This is a test.") }}</p>
  </div>
</template>

<script>
export default {
  name: 'TestComponent',
  methods: {
    t(key) {
      // This is a placeholder for the actual translation function
      return key;
    }
  }
}
</script>

<style scoped>
h1 {
  color: blue;
}
</style> 