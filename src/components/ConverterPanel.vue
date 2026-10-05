<script setup>
/**
 * ConverterPanel —— 进制转换 + 单位换算
 * 两个子标签页的所有换算结果都来自后端：
 *   进制转换 → POST /api/convert/base
 *   单位换算 → GET  /api/convert/units（取类别与单位）+ POST /api/convert/unit
 * 前端不内置任何换算系数，也不实现进制算法。
 */
import { computed, onMounted, ref, watch } from 'vue';
import { convertBase, convertUnit, getUnits } from '@/api/convert';

/** 进制可选项：2..36 */
const BASE_OPTIONS = Array.from({ length: 35 }, (unused, index) => index + 2);
/** 常用进制快捷按钮 */
const QUICK_BASES = [2, 8, 10, 16];

/**
 * 内置单位表：仅在 GET /api/convert/units 请求失败时用于「撑起下拉框」，
 * 界面上会明确提示后端未连接，换算本身仍然必须调用后端接口。
 */
const FALLBACK_CATEGORIES = [
  {
    key: 'length',
    name: '长度',
    units: [
      { key: 'mm', name: '毫米' },
      { key: 'cm', name: '厘米' },
      { key: 'm', name: '米' },
      { key: 'km', name: '千米' },
      { key: 'in', name: '英寸' },
      { key: 'ft', name: '英尺' },
      { key: 'mi', name: '英里' },
    ],
  },
  {
    key: 'mass',
    name: '质量',
    units: [
      { key: 'mg', name: '毫克' },
      { key: 'g', name: '克' },
      { key: 'kg', name: '千克' },
      { key: 't', name: '吨' },
      { key: 'oz', name: '盎司' },
      { key: 'lb', name: '磅' },
    ],
  },
  {
    key: 'temperature',
    name: '温度',
    units: [
      { key: 'c', name: '摄氏度' },
      { key: 'f', name: '华氏度' },
      { key: 'k', name: '开尔文' },
    ],
  },
  {
    key: 'area',
    name: '面积',
    units: [
      { key: 'cm2', name: '平方厘米' },
      { key: 'm2', name: '平方米' },
      { key: 'km2', name: '平方千米' },
      { key: 'ha', name: '公顷' },
      { key: 'acre', name: '英亩' },
    ],
  },
  {
    key: 'time',
    name: '时间',
    units: [
      { key: 'ms', name: '毫秒' },
      { key: 's', name: '秒' },
      { key: 'min', name: '分钟' },
      { key: 'h', name: '小时' },
      { key: 'd', name: '天' },
    ],
  },
  {
    key: 'speed',
    name: '速度',
    units: [
      { key: 'm/s', name: '米每秒' },
      { key: 'km/h', name: '千米每小时' },
      { key: 'mph', name: '英里每小时' },
      { key: 'kn', name: '节' },
    ],
  },
  {
    key: 'storage',
    name: '数据存储',
    units: [
      { key: 'B', name: '字节' },
      { key: 'KB', name: '千字节' },
      { key: 'MB', name: '兆字节' },
      { key: 'GB', name: '吉字节' },
      { key: 'TB', name: '太字节' },
    ],
  },
];

const activeTab = ref('base');

/* ---------------- 进制转换 ---------------- */
const baseValue = ref('255');
const fromBase = ref(10);
const toBase = ref(16);
const baseOutput = ref('');
const baseDecimal = ref('');
const baseError = ref(null);
const baseLoading = ref(false);
let baseTimer = null;

async function runBaseConvert() {
  const value = baseValue.value.trim();
  baseError.value = null;
  if (!value) {
    // 输入为空时不发请求（也就不需要任何本地错误文案）
    baseOutput.value = '';
    baseDecimal.value = '';
    return;
  }
  baseLoading.value = true;
  try {
    const data = await convertBase(value, Number(fromBase.value), Number(toBase.value));
    baseOutput.value = data.output ?? '';
    baseDecimal.value = data.decimalValue ?? '';
  } catch (err) {
    baseOutput.value = '';
    baseDecimal.value = '';
    baseError.value = { message: err.message, network: Boolean(err.network) };
  } finally {
    baseLoading.value = false;
  }
}

function scheduleBaseConvert() {
  if (baseTimer) {
    clearTimeout(baseTimer);
  }
  baseTimer = setTimeout(runBaseConvert, 300);
}

watch([baseValue, fromBase, toBase], scheduleBaseConvert);

/* ---------------- 单位换算 ---------------- */
const categories = ref([]);
const categoryKey = ref('');
const fromUnit = ref('');
const toUnit = ref('');
const unitValue = ref('1');
const unitOutput = ref('');
const unitError = ref(null);
const unitLoading = ref(false);
const usingFallback = ref(false);
let unitTimer = null;

const currentCategory = computed(
  () => categories.value.find((item) => item.key === categoryKey.value) || null,
);
const unitOptions = computed(() => (currentCategory.value ? currentCategory.value.units : []));

async function loadUnits() {
  try {
    const data = await getUnits();
    const list = Array.isArray(data.categories) ? data.categories : [];
    if (!list.length) {
      throw new Error('后端未返回任何单位类别');
    }
    categories.value = list;
    usingFallback.value = false;
    unitError.value = null;
  } catch (err) {
    categories.value = FALLBACK_CATEGORIES;
    usingFallback.value = true;
    unitError.value = { message: err.message, network: Boolean(err.network) };
  }
  if (!categories.value.length) {
    return;
  }
  if (!categoryKey.value || !categories.value.some((item) => item.key === categoryKey.value)) {
    categoryKey.value = categories.value[0].key;
  }
  resetUnits();
}

/** 切换类别后重选单位（默认取前两个），仅做下拉框联动，不涉及换算 */
function resetUnits() {
  const units = unitOptions.value;
  fromUnit.value = units.length ? units[0].key : '';
  toUnit.value = units.length > 1 ? units[1].key : fromUnit.value;
}

async function runUnitConvert() {
  const value = String(unitValue.value).trim();
  unitError.value = null;
  if (!value || !categoryKey.value || !fromUnit.value || !toUnit.value) {
    unitOutput.value = '';
    return;
  }
  unitLoading.value = true;
  try {
    // 仅把用户输入的字符串转成 JSON 数字（传输层需要），换算由后端完成
    const numeric = Number(value);
    const payloadValue = Number.isFinite(numeric) ? numeric : value;
    const data = await convertUnit(categoryKey.value, fromUnit.value, toUnit.value, payloadValue);
    unitOutput.value = data.outputText ?? String(data.output ?? '');
  } catch (err) {
    unitOutput.value = '';
    unitError.value = { message: err.message, network: Boolean(err.network) };
  } finally {
    unitLoading.value = false;
  }
}

function scheduleUnitConvert() {
  if (unitTimer) {
    clearTimeout(unitTimer);
  }
  unitTimer = setTimeout(runUnitConvert, 300);
}

watch([unitValue, fromUnit, toUnit, categoryKey], scheduleUnitConvert);

function onCategoryChange() {
  resetUnits();
  scheduleUnitConvert();
}

/** 交换源单位与目标单位（只交换 key，重新换算仍由后端完成） */
function onSwapUnits() {
  const previousFrom = fromUnit.value;
  fromUnit.value = toUnit.value;
  toUnit.value = previousFrom;
}

function onFromUnitChange() {
  if (fromUnit.value === toUnit.value && unitOptions.value.length > 1) {
    const alternative = unitOptions.value.find((item) => item.key !== fromUnit.value);
    if (alternative) {
      toUnit.value = alternative.key;
    }
  }
}

onMounted(async () => {
  runBaseConvert();
  await loadUnits();
  runUnitConvert();
});
</script>

<template>
  <section class="panel converter">
    <header class="panel__head">
      <h2 class="panel__title">转换工具</h2>
      <span class="panel__subtitle">换算结果同样由后端计算</span>
    </header>

    <nav class="sub-tabs">
      <button
        class="sub-tab"
        :class="{ 'sub-tab--active': activeTab === 'base' }"
        type="button"
        data-testid="convert-tab-base"
        @click="activeTab = 'base'"
      >
        进制转换
      </button>
      <button
        class="sub-tab"
        :class="{ 'sub-tab--active': activeTab === 'unit' }"
        type="button"
        data-testid="convert-tab-unit"
        @click="activeTab = 'unit'"
      >
        单位换算
      </button>
    </nav>

    <div v-show="activeTab === 'base'" class="converter__body">
      <div class="field">
        <label class="field__label" for="base-value-input">输入值</label>
        <input
          id="base-value-input"
          v-model="baseValue"
          class="input"
          type="text"
          data-testid="base-convert-input"
          placeholder="例如 255、1010、-1F.8"
          autocomplete="off"
          spellcheck="false"
        />
      </div>

      <div class="field-row">
        <div class="field">
          <label class="field__label" for="base-from-select">源进制</label>
          <select id="base-from-select" v-model="fromBase" class="select" data-testid="base-from-select">
            <option v-for="base in BASE_OPTIONS" :key="`from-${base}`" :value="base">{{ base }} 进制</option>
          </select>
        </div>
        <div class="field">
          <label class="field__label" for="base-to-select">目标进制</label>
          <select id="base-to-select" v-model="toBase" class="select" data-testid="base-to-select">
            <option v-for="base in BASE_OPTIONS" :key="`to-${base}`" :value="base">{{ base }} 进制</option>
          </select>
        </div>
      </div>

      <div class="chips">
        <span class="chips__label">目标进制快捷选择</span>
        <button
          v-for="base in QUICK_BASES"
          :key="`quick-${base}`"
          class="chip"
          :class="{ 'chip--active': Number(toBase) === base }"
          type="button"
          :data-testid="`base-quick-${base}`"
          @click="toBase = base"
        >
          {{ base }}
        </button>
      </div>

      <div class="result-box">
        <span class="result-box__label">{{ toBase }} 进制结果</span>
        <output class="result-box__value" data-testid="base-convert-output">{{ baseOutput || '—' }}</output>
      </div>
      <p class="converter__meta">
        十进制值：{{ baseDecimal || '—' }}
        <span v-if="baseLoading"> · 正在请求后端…</span>
      </p>
      <p v-if="baseError" class="error-banner error-banner--inline" data-testid="base-convert-error" role="alert">
        <span class="error-banner__icon" aria-hidden="true">!</span>
        <span class="error-banner__text">{{ baseError.message }}</span>
      </p>
    </div>

    <div v-show="activeTab === 'unit'" class="converter__body">
      <p v-if="usingFallback" class="converter__warn" data-testid="unit-fallback-tip">
        后端单位表获取失败，下拉框暂时使用内置单位列表；换算仍会请求后端。
        <button class="btn btn--ghost btn--sm" type="button" @click="loadUnits()">重试</button>
      </p>

      <div class="field">
        <label class="field__label" for="unit-category-select">类别</label>
        <select
          id="unit-category-select"
          v-model="categoryKey"
          class="select"
          data-testid="unit-category"
          @change="onCategoryChange"
        >
          <option v-for="category in categories" :key="category.key" :value="category.key">
            {{ category.name }}
          </option>
        </select>
      </div>

      <div class="field-row field-row--unit">
        <div class="field">
          <label class="field__label" for="unit-from-select">源单位</label>
          <select
            id="unit-from-select"
            v-model="fromUnit"
            class="select"
            data-testid="unit-from"
            @change="onFromUnitChange"
          >
            <option v-for="unit in unitOptions" :key="unit.key" :value="unit.key">{{ unit.name }}</option>
          </select>
        </div>

        <button class="btn btn--ghost btn--swap" type="button" data-testid="unit-swap" title="交换源单位与目标单位" @click="onSwapUnits">
          ⇄
        </button>

        <div class="field">
          <label class="field__label" for="unit-to-select">目标单位</label>
          <select id="unit-to-select" v-model="toUnit" class="select" data-testid="unit-to">
            <option v-for="unit in unitOptions" :key="unit.key" :value="unit.key">{{ unit.name }}</option>
          </select>
        </div>
      </div>

      <div class="field">
        <label class="field__label" for="unit-value-input">数值</label>
        <input
          id="unit-value-input"
          v-model="unitValue"
          class="input"
          type="text"
          data-testid="unit-convert-input"
          placeholder="例如 1000"
          autocomplete="off"
          spellcheck="false"
        />
      </div>

      <div class="result-box">
        <span class="result-box__label">换算结果</span>
        <output class="result-box__value" data-testid="unit-convert-output">{{ unitOutput || '—' }}</output>
      </div>
      <p class="converter__meta">
        {{ unitValue || '—' }} {{ fromUnit || '—' }} → {{ unitOutput || '—' }} {{ toUnit || '—' }}
        <span v-if="unitLoading"> · 正在请求后端…</span>
      </p>
      <p v-if="unitError && !usingFallback" class="error-banner error-banner--inline" data-testid="unit-convert-error" role="alert">
        <span class="error-banner__icon" aria-hidden="true">!</span>
        <span class="error-banner__text">{{ unitError.message }}</span>
      </p>
    </div>
  </section>
</template>
