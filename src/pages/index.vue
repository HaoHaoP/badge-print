<script setup lang="ts">
import {onMounted, onUnmounted, reactive, ref, watch} from 'vue'
import type {ElMessage, FormInstance, FormRules} from 'element-plus'

interface RuleForm {
  paper: string
  row: string
  col: string
  diam: string
  padding: string
}

interface PaperSize {
  width: number
  height: number
}

const paperSize: Map<String, PaperSize> = new Map([
  ['A4', {width: 21.0, height: 29.7}],
  ['A5', {width: 14.8, height: 21.0}]
])

const ruleFormRef = ref<FormInstance>()
const ruleForm = reactive<RuleForm>({
  diam: '6.6',
  padding: '0.2',
  paper: 'A4',
  row: '4',
  col: '2'
})

const rules = reactive<FormRules<RuleForm>>({
  diam: [
    {required: true, message: '请输入直径', trigger: 'blur'}
  ],
  padding: [
    {required: true, message: '请输入边距', trigger: 'blur'}
  ],
  paper: [
    {required: true, message: '请选择纸张大小', trigger: 'blur'}
  ],
  row: [
    {required: true, message: '请输入行数', trigger: 'blur'}
  ],
  col: [
    {required: true, message: '请输入列数', trigger: 'blur'}
  ]
})

const images = ref<Array<Array<string>>>([])
const previewBox = ref<HTMLElement>()
const preview = ref<HTMLElement>()

const submitForm = ref<RuleForm>(ruleForm)

watch(submitForm, () => {
  calcPaper()
}, {deep: true})

const onSubmit = () => {
  ruleFormRef.value?.validate((valid) => {
    if (valid) {
      const {paper, row, col, diam, padding} = ruleForm
      const {width, height} = paperSize.get(paper) || {width: 0, height: 0}
      const actWidth = parseInt(col) * (parseFloat(diam) + parseFloat(padding) * 2)
      console.log(actWidth / col)
      if (actWidth > width) {
        ElMessage.warning('列数过多，无法排版')
        return
      }
      const actHeight = parseInt(row) * (parseFloat(diam) + parseFloat(padding) * 2)
      if (actHeight > height) {
        ElMessage.warning('行数过多，无法排版')
        return
      }
      const arr = []
      for (let i = 0; i < parseInt(col); i++) {
        const colArr = []
        for (let j = 0; j < parseInt(row); j++) {
          colArr.push('')
        }
        arr.push(colArr)
      }
      images.value = arr
      submitForm.value = {...ruleForm}
    }
  })
}
const calcPaper = () => {
  const {paper, row, col, diam, padding} = submitForm.value
  const {width, height} = paperSize.get(paper) || {width: 0, height: 0}
  const previewBoxWidth = previewBox.value ? previewBox.value.offsetWidth - 40 : 0
  const previewBoxHeight = previewBox.value ? previewBox.value.offsetHeight - 40 : 0
  let scala = 0
  if (previewBoxWidth / previewBoxHeight > width / height) {
    scala = previewBoxHeight / height
  } else {
    scala = previewBoxWidth / width
  }
  console.log(scala)
  if (preview.value) {
    preview.value.style.height = `${scala * height}px`
    preview.value.style.width = `${scala * width}px`
  }

  const rowArr = []
  for (let i = 0; i < parseInt(row); i++) {
    const colArr = []
    for (let j = 0; j < parseInt(col); j++) {
      colArr.push('')
    }
    rowArr.push(colArr)
  }
  images.value = rowArr
  console.log(rowArr)
  const badgeBg = document.getElementsByClassName('badge-bg');
  const badgeBgArr: HTMLElement[] = Array.from(badgeBg) as HTMLElement[];
  const badge = document.getElementsByClassName('badge');
  const badgeArr: HTMLElement[] = Array.from(badge) as HTMLElement[];
  badgeBgArr.forEach(item => {
    item.style.width = `${scala * (parseFloat(diam) + parseFloat(padding) * 2)}px`
    item.style.height = `${scala * (parseFloat(diam) + parseFloat(padding) * 2)}px`
  })
  badgeArr.forEach(item => {
    item.style.width = `${scala * parseFloat(diam)}px`
    item.style.height = `${scala * parseFloat(diam)}px`
  })
}
onMounted(() => {
  calcPaper()
  window.addEventListener('resize', calcPaper)
})
onUnmounted(() => {
  window.removeEventListener('resize', calcPaper)
})
</script>

<template>
  <div class="index">
    <div ref="previewBox" class="preview-box">
      <div class="preview" ref="preview">
        <div class="row" v-for="(row, i) in images" :key="i">
          <div class="badge-bg" v-for="(image, j) in images[i]" :key="j">
            <div class="badge">
              <img :src="image" alt=""/>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="content">
      <h1 class="title">吧唧打印图排版工具</h1>
      <el-form class="form" ref="ruleFormRef" :model="ruleForm" :rules="rules" label-position="left"
               label-width="120px">
        <el-form-item label="纸张大小" prop="paper">
          <el-radio-group v-model="ruleForm.paper">
            <el-radio-button label="A4">A4</el-radio-button>
            <el-radio-button label="A5">A5</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="行数" prop="row">
          <el-input-number v-model="ruleForm.row" controls-position="right" :min="1"/>
        </el-form-item>
        <el-form-item label="列数" prop="col">
          <el-input-number v-model="ruleForm.col" controls-position="right" :min="1"/>
        </el-form-item>
        <el-form-item label="直径(cm)" prop="diam">
          <el-input-number v-model="ruleForm.diam" :precision="2" controls-position="right" :min="0"/>
        </el-form-item>
        <el-form-item label="边距(cm)" prop="padding">
          <el-input-number v-model="ruleForm.padding" :precision="2" controls-position="right" :min="0"/>
        </el-form-item>
      </el-form>
      <el-button type="primary" @click="onSubmit">生成</el-button>
    </div>
  </div>
</template>

<style scoped>
.index {
  display: flex;
  width: 100%;
  height: 100%;

  .preview-box {
    flex: 3;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.1);
    height: 100%;
    overflow: hidden;

    .preview {
      width: 100%;
      height: 100%;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: space-evenly;
      flex-direction: column;

      .row {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-evenly;

        .badge-bg {
          background: rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;

          .badge {
            background: #66CCFF;
            border-radius: 50%;
          }
        }
      }
    }
  }

  .content {
    flex: 1;
    width: 100%;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;

    .title {
      font-size: 21px;
      font-weight: bold;
      width: 100%;
      text-align: center;
      margin: 0;
    }

    .form {
      margin: 40px 0 60px 0;
    }
  }
}
</style>
