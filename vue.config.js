// vue.config.js
module.exports = {
  compilerOptions: {
    // 把所有以 uni- 开头的标签都当作自定义原生元素，跳过 Vue 的组件解析
    isCustomElement: (tag) => tag.startsWith('uni-')
  }
};