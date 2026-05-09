function generateId() {
  return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

function getCategoryName(categoryId) {
  const names = {
    chest: '胸部',
    back: '背部',
    shoulders: '肩部',
    arms: '手臂',
    legs: '腿部',
    abs: '腹部',
  }
  return names[categoryId] || '腹部'
}

const RAW_ACTIONS = [
  // ── 胸部 - 上胸 ──
  {
    name: '上斜杠铃卧推',
    categories: ['chest'],
    subcategories: {
      chest: ['upper_chest']
    }
  },
  {
    name: '上斜哑铃卧推',
    categories: ['chest'],
    subcategories: {
      chest: ['upper_chest']
    },
    isUnilateral: true
  },
  {
    name: '上斜史密斯卧推',
    categories: ['chest'],
    subcategories: {
      chest: ['upper_chest']
    }
  },
  {
    name: '低位绳索飞鸟',
    categories: ['chest'],
    subcategories: {
      chest: ['upper_chest']
    },
    isUnilateral: true
  },
  {
    name: '上斜器械夹胸',
    categories: ['chest'],
    subcategories: {
      chest: ['upper_chest']
    }
  },
  {
    name: '哑铃上斜飞鸟',
    categories: ['chest'],
    subcategories: {
      chest: ['upper_chest']
    },
    isUnilateral: true
  },
  {
    name: '上斜器械推胸',
    categories: ['chest'],
    subcategories: {
      chest: ['upper_chest']
    }
  },

  // ── 胸部 - 中下胸 ──
  {
    name: '平板杠铃卧推',
    categories: ['chest'],
    subcategories: {
      chest: ['mid_lower_chest']
    }
  },
  {
    name: '平板哑铃卧推',
    categories: ['chest'],
    subcategories: {
      chest: ['mid_lower_chest']
    },
    isUnilateral: true
  },
  {
    name: '平板史密斯卧推',
    categories: ['chest'],
    subcategories: {
      chest: ['mid_lower_chest']
    }
  },
  {
    name: '高位绳索夹胸',
    categories: ['chest'],
    subcategories: {
      chest: ['mid_lower_chest']
    },
    isUnilateral: true
  },
  {
    name: '坐姿器械平推',
    categories: ['chest'],
    subcategories: {
      chest: ['mid_lower_chest']
    }
  },
  {
    name: '双杠臂屈伸',
    categories: ['chest', 'arms'],
    subcategories: {
      chest: ['mid_lower_chest'],
      arms: ['triceps']
    }
  },
  {
    name: '下斜器械推胸',
    categories: ['chest'],
    subcategories: {
      chest: ['mid_lower_chest']
    }
  },
  {
    name: '平板哑铃飞鸟',
    categories: ['chest'],
    subcategories: {
      chest: ['mid_lower_chest']
    },
    isUnilateral: true
  },
  {
    name: '蝴蝶机夹胸',
    categories: ['chest'],
    subcategories: {
      chest: ['mid_lower_chest']
    }
  },

  // ── 背部 - 大圆 ──
  {
    name: '宽握引体向上',
    categories: ['back'],
    subcategories: {
      back: ['teres_major']
    }
  },
  {
    name: '宽距高位下拉',
    categories: ['back'],
    subcategories: {
      back: ['teres_major']
    }
  },
  {
    name: '对握宽距下拉',
    categories: ['back'],
    subcategories: {
      back: ['teres_major']
    }
  },
  {
    name: '大剪刀下拉',
    categories: ['back'],
    subcategories: {
      back: ['teres_major']
    }
  },

  // ── 背部 - 上斜方 ──
  {
    name: '杠铃站姿耸肩',
    categories: ['back'],
    subcategories: {
      back: ['upper_traps']
    }
  },
  {
    name: '哑铃站姿耸肩',
    categories: ['back'],
    subcategories: {
      back: ['upper_traps']
    },
    isUnilateral: true
  },
  {
    name: '史密斯耸肩',
    categories: ['back'],
    subcategories: {
      back: ['upper_traps']
    }
  },
  {
    name: '坐姿哑铃耸肩',
    categories: ['back'],
    subcategories: {
      back: ['upper_traps']
    },
    isUnilateral: true
  },
  {
    name: '绳索站姿耸肩',
    categories: ['back'],
    subcategories: {
      back: ['upper_traps']
    }
  },

  // ── 背部 - 中下斜方 ──
  {
    name: '宽距绳索划船',
    categories: ['back'],
    subcategories: {
      back: ['mid_lower_traps']
    }
  },
  {
    name: '宽握器械划船',
    categories: ['back'],
    subcategories: {
      back: ['mid_lower_traps']
    }
  },
  {
    name: '正握杠铃划船',
    categories: ['back'],
    subcategories: {
      back: ['mid_lower_traps']
    }
  },
  {
    name: 'Keslo耸肩',
    categories: ['back'],
    subcategories: {
      back: ['mid_lower_traps']
    }
  },

  // ── 背部 - 背阔 ──
  {
    name: '对握引体向上',
    categories: ['back'],
    subcategories: {
      back: ['lats']
    }
  },
  {
    name: '反握引体向上',
    categories: ['back'],
    subcategories: {
      back: ['lats']
    }
  },
  {
    name: '反握高位下拉',
    categories: ['back'],
    subcategories: {
      back: ['lats']
    }
  },
  {
    name: '对握窄距下拉',
    categories: ['back'],
    subcategories: {
      back: ['lats']
    }
  },
  {
    name: '直臂下压',
    categories: ['back'],
    subcategories: {
      back: ['lats']
    }
  },
  {
    name: '单臂绳索下拉',
    categories: ['back'],
    subcategories: {
      back: ['lats']
    },
    isUnilateral: true
  },
  {
    name: '单臂器械下拉',
    categories: ['back'],
    subcategories: {
      back: ['lats']
    },
    isUnilateral: true
  },
  {
    name: 'T杠划船',
    categories: ['back'],
    subcategories: {
      back: ['lats']
    }
  },
  {
    name: '单臂器械划船',
    categories: ['back'],
    subcategories: {
      back: ['lats']
    },
    isUnilateral: true
  },
  {
    name: '单臂绳索划船',
    categories: ['back'],
    subcategories: {
      back: ['lats']
    },
    isUnilateral: true
  },
  {
    name: '单臂哑铃划船',
    categories: ['back'],
    subcategories: {
      back: ['lats']
    },
    isUnilateral: true
  },
  {
    name: 'V把绳索划船',
    categories: ['back'],
    subcategories: {
      back: ['lats']
    }
  },
  {
    name: '梅多斯划船',
    categories: ['back'],
    subcategories: {
      back: ['lats']
    },
    isUnilateral: true
  },

  // ── 背部 - 竖脊肌 ──
  {
    name: '杠铃传统硬拉',
    categories: ['back'],
    subcategories: {
      back: ['erector_spinae']
    }
  },
  {
    name: '罗马尼亚硬拉',
    categories: ['back', 'legs'],
    subcategories: {
      back: ['erector_spinae'],
      legs: ['hamstrings']
    }
  },
  {
    name: '山羊挺身',
    categories: ['back'],
    subcategories: {
      back: ['erector_spinae']
    }
  },

  // ── 肩部 - 前束 ──
  {
    name: '站姿杠铃推举',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['front_delt']
    }
  },
  {
    name: '站姿哑铃推举',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['front_delt']
    },
    isUnilateral: true
  },
  {
    name: '坐姿哑铃推举',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['front_delt']
    },
    isUnilateral: true
  },
  {
    name: '史密斯肩推',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['front_delt']
    }
  },
  {
    name: '实力推',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['front_delt']
    }
  },
  {
    name: '哑铃前平举',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['front_delt']
    },
    isUnilateral: true
  },
  {
    name: '绳索前平举',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['front_delt']
    }
  },
  {
    name: '器械推肩',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['front_delt']
    }
  },

  // ── 肩部 - 中束 ──
  {
    name: '哑铃侧平举',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['side_delt']
    },
    isUnilateral: true
  },
  {
    name: '绳索侧平举',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['side_delt']
    },
    isUnilateral: true
  },
  {
    name: '坐姿器械侧平举',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['side_delt']
    }
  },
  {
    name: '站姿器械侧平举',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['side_delt']
    }
  },
  {
    name: '绳索Y举',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['side_delt']
    },
    isUnilateral: true
  },
  {
    name: '哑铃提拉',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['side_delt']
    },
    isUnilateral: true
  },
  {
    name: '杠铃提拉',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['side_delt']
    }
  },

  // ── 肩部 - 后束 ──
  {
    name: '哑铃俯身飞鸟',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['rear_delt']
    },
    isUnilateral: true
  },
  {
    name: '蝴蝶机反向飞鸟',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['rear_delt']
    }
  },
  {
    name: '绳索面拉',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['rear_delt']
    }
  },
  {
    name: '杠铃俯身提拉',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['rear_delt']
    }
  },
  {
    name: '哑铃俯身提拉',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['rear_delt']
    },
    isUnilateral: true
  },
  {
    name: 'T杠肩外展',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['rear_delt']
    }
  },
  {
    name: '高位下拉面拉',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['rear_delt']
    }
  },
  {
    name: '绳索肩外展',
    categories: ['shoulders'],
    subcategories: {
      shoulders: ['rear_delt']
    },
    isUnilateral: true
  },

  // ── 手臂 - 二头 ──
  {
    name: '杠铃弯举',
    categories: ['arms'],
    subcategories: {
      arms: ['biceps']
    }
  },
  {
    name: '哑铃弯举',
    categories: ['arms'],
    subcategories: {
      arms: ['biceps']
    },
    isUnilateral: true
  },
  {
    name: '哑铃交替弯举',
    categories: ['arms'],
    subcategories: {
      arms: ['biceps']
    },
    isUnilateral: true
  },
  {
    name: '牧师凳杠铃弯举',
    categories: ['arms'],
    subcategories: {
      arms: ['biceps']
    }
  },
  {
    name: '牧师凳哑铃弯举',
    categories: ['arms'],
    subcategories: {
      arms: ['biceps']
    },
    isUnilateral: true
  },
  {
    name: '直杆反握弯举',
    categories: ['arms'],
    subcategories: {
      arms: ['biceps']
    }
  },
  {
    name: '哑铃集中弯举',
    categories: ['arms'],
    subcategories: {
      arms: ['biceps']
    },
    isUnilateral: true
  },
  {
    name: '哑铃锤式弯举',
    categories: ['arms'],
    subcategories: {
      arms: ['biceps']
    },
    isUnilateral: true
  },
  {
    name: '绳索锤式弯举',
    categories: ['arms'],
    subcategories: {
      arms: ['biceps']
    }
  },
  {
    name: '复合弯举',
    categories: ['arms'],
    subcategories: {
      arms: ['biceps']
    }
  },
  {
    name: '上斜凳弯举',
    categories: ['arms'],
    subcategories: {
      arms: ['biceps']
    },
    isUnilateral: true
  },

  // ── 手臂 - 三头 ──
  {
    name: '杠铃窄距卧推',
    categories: ['arms'],
    subcategories: {
      arms: ['triceps']
    }
  },
  {
    name: '直杆下压',
    categories: ['arms'],
    subcategories: {
      arms: ['triceps']
    }
  },
  {
    name: '哑铃过头臂屈伸',
    categories: ['arms'],
    subcategories: {
      arms: ['triceps']
    },
    isUnilateral: true
  },
  {
    name: '杠铃过头臂屈伸',
    categories: ['arms'],
    subcategories: {
      arms: ['triceps']
    }
  },
  {
    name: '直杆过头臂屈伸',
    categories: ['arms'],
    subcategories: {
      arms: ['triceps']
    }
  },
  {
    name: '仰卧杠铃臂屈伸',
    categories: ['arms'],
    subcategories: {
      arms: ['triceps']
    }
  },
  {
    name: '器械臂屈伸',
    categories: ['arms'],
    subcategories: {
      arms: ['triceps']
    }
  },
  {
    name: '单臂绳索下压',
    categories: ['arms'],
    subcategories: {
      arms: ['triceps']
    },
    isUnilateral: true
  },
  {
    name: 'JM推举',
    categories: ['arms'],
    subcategories: {
      arms: ['triceps']
    }
  },
  {
    name: '史密斯窄推',
    categories: ['arms'],
    subcategories: {
      arms: ['triceps']
    }
  },
  {
    name: '绳索下压',
    categories: ['arms'],
    subcategories: {
      arms: ['triceps']
    }
  },
  {
    name: '绳索过头臂屈伸',
    categories: ['arms'],
    subcategories: {
      arms: ['triceps']
    }
  },

  // ── 腹部 ──
  {
    name: '卷腹',
    categories: ['abs'],
    subcategories: {
      abs: ['abs']
    }
  },
  {
    name: '龙门架卷腹',
    categories: ['abs'],
    subcategories: {
      abs: ['abs']
    }
  },
  {
    name: '俄罗斯转体',
    categories: ['abs'],
    subcategories: {
      abs: ['abs']
    }
  },
  {
    name: '悬垂举腿',
    categories: ['abs'],
    subcategories: {
      abs: ['abs']
    }
  },
  {
    name: '器械坐姿卷腹',
    categories: ['abs'],
    subcategories: {
      abs: ['abs']
    }
  },

  // ── 腿部 - 股四头 ──
  {
    name: '杠铃深蹲',
    categories: ['legs'],
    subcategories: {
      legs: ['quads']
    }
  },
  {
    name: '史密斯深蹲',
    categories: ['legs'],
    subcategories: {
      legs: ['quads']
    }
  },
  {
    name: '哈克深蹲',
    categories: ['legs'],
    subcategories: {
      legs: ['quads']
    }
  },
  {
    name: '箭步蹲',
    categories: ['legs'],
    subcategories: {
      legs: ['quads']
    }
  },
  {
    name: '腿举机',
    categories: ['legs'],
    subcategories: {
      legs: ['quads']
    }
  },
  {
    name: '器械腿屈伸',
    categories: ['legs'],
    subcategories: {
      legs: ['quads']
    }
  },
  {
    name: '颈前深蹲',
    categories: ['legs'],
    subcategories: {
      legs: ['quads']
    }
  },
  {
    name: '高脚杯深蹲',
    categories: ['legs'],
    subcategories: {
      legs: ['quads']
    }
  },
  {
    name: '泽奇深蹲',
    categories: ['legs'],
    subcategories: {
      legs: ['quads']
    }
  },
  {
    name: '保加利亚蹲',
    categories: ['legs'],
    subcategories: {
      legs: ['quads', 'glutes']
    },
    isUnilateral: true
  },
  {
    name: '低脚位倒蹬',
    categories: ['legs'],
    subcategories: {
      legs: ['quads']
    }
  },

  // ── 腿部 - 腘绳 ──
  {
    name: '器械腿弯举',
    categories: ['legs'],
    subcategories: {
      legs: ['hamstrings']
    }
  },
  {
    name: '直腿硬拉',
    categories: ['legs'],
    subcategories: {
      legs: ['hamstrings']
    }
  },
  {
    name: '哈克腘绳屈伸',
    categories: ['legs'],
    subcategories: {
      legs: ['hamstrings']
    }
  },
  {
    name: '单臂哑铃罗拉',
    categories: ['legs'],
    subcategories: {
      legs: ['hamstrings']
    },
    isUnilateral: true
  },
  {
    name: '高脚位倒蹬',
    categories: ['legs'],
    subcategories: {
      legs: ['hamstrings']
    }
  },

  // ── 腿部 - 小腿 ──
  {
    name: '站姿提踵',
    categories: ['legs'],
    subcategories: {
      legs: ['calves']
    }
  },
  {
    name: '坐姿提踵',
    categories: ['legs'],
    subcategories: {
      legs: ['calves']
    }
  },
  {
    name: '单腿提踵',
    categories: ['legs'],
    subcategories: {
      legs: ['calves']
    },
    isUnilateral: true
  },

  // ── 腿部 - 臀部 ──
  {
    name: '杠铃臀推',
    categories: ['legs'],
    subcategories: {
      legs: ['glutes']
    }
  },
  {
    name: '器械臀推',
    categories: ['legs'],
    subcategories: {
      legs: ['glutes']
    }
  },
  {
    name: '相扑硬拉',
    categories: ['legs'],
    subcategories: {
      legs: ['glutes']
    }
  },
  {
    name: '绳索后踢腿',
    categories: ['legs'],
    subcategories: {
      legs: ['glutes']
    },
    isUnilateral: true
  },
  {
    name: '器械髋外展',
    categories: ['legs'],
    subcategories: {
      legs: ['glutes']
    }
  },
  {
    name: '器械髋内收',
    categories: ['legs'],
    subcategories: {
      legs: ['glutes']
    }
  },
  {
    name: '器械后踢腿',
    categories: ['legs'],
    subcategories: {
      legs: ['glutes']
    },
    isUnilateral: true
  },
]

export function getInitialActions() {
  return RAW_ACTIONS.map(raw => ({
    id: generateId(),
    name: raw.name,
    categories: raw.categories,
    subcategories: raw.subcategories || {},
    categoryName: getCategoryName(raw.categories[0]),
    createdAt: new Date().toISOString(),
    isUnilateral: raw.isUnilateral || false,
  }))
}

export function getInitialActionNames() {
  return RAW_ACTIONS.map(a => a.name)
}