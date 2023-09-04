<script setup lang="ts">
import type {FormInstance, FormRules} from 'element-plus'
import {CircleStencil, Cropper, CropperResult} from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';
import {Crop, Edit, Plus} from '@element-plus/icons-vue'
import html2canvas from 'html2canvas';

interface RuleForm {
  row: number
  col: number
  diam: number
  padding: number
  color: string,
  width: number
  height: number
}

interface PaperSize {
  width: number
  height: number
}

const paperSize: Map<string, PaperSize> = new Map([
  ['A3', {
    width: 7016,
    height: 9921
  }],
  ['A4', {
    width: 4961,
    height: 7016
  }],
  ['A5', {
    width: 3496,
    height: 4961
  }],
  ['自定义', {
    width: 4961,
    height: 7016
  }],
])

const paper = ref<string>('A4')

watch(paper, (val) => {
  ruleForm.width = paperSize.get(val)?.width || 0
  ruleForm.height = paperSize.get(val)?.height || 0
})

const ruleFormRef = ref<FormInstance>()
const ruleForm = reactive<RuleForm>({
  diam: 6.6,
  padding: 0.2,
  width: 4961,
  height: 7016,
  row: 4,
  col: 2,
  color: '#DDDDDD'
})

const rules = reactive<FormRules<RuleForm>>({
  diam: [
    {required: true, message: '请输入直径', trigger: 'blur'}
  ],
  padding: [
    {required: true, message: '请输入边距', trigger: 'blur'}
  ],
  row: [
    {required: true, message: '请输入行数', trigger: 'blur'}
  ],
  col: [
    {required: true, message: '请输入列数', trigger: 'blur'}
  ],
  color: [
    {required: true, message: '请选择边框颜色', trigger: 'blur'}
  ],
  width: [
    {required: true, message: '请输入纸张宽度', trigger: 'blur'}
  ],
  height: [
    {required: true, message: '请输入纸张高度', trigger: 'blur'}
  ],
})

const tempImages = ref<Array<Array<string>>>([])
const images = ref<Array<Array<string>>>([])
const previewBox = ref<HTMLElement>()
const preview = ref<HTMLElement>()
const badgeBg = ref<HTMLElement[]>([])
const badge = ref<HTMLElement[]>([])

const btnScale = ref(1)

const submitForm = ref<RuleForm>({...ruleForm})

const onSubmit = () => {
  if (images.value.every(i => i.every(j => !j))) {
    validateForm()
    return
  }
  ElMessageBox.confirm(
      '已选图片将会被清空，是否继续？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
  ).then(() => {
    validateForm()
  })
}
const cmTo600Dpi = (cm: number) => {
  return cm / 2.54 * 600
}
const validateForm = () => {
  ruleFormRef.value?.validate((valid) => {
    if (valid) {
      const {row, col, diam, padding, width, height} = ruleForm
      const actWidth = cmTo600Dpi(col * (diam + padding * 2))
      if (actWidth > width) {
        ElMessage.warning('列数过多，无法排版')
        return
      }
      const actHeight = cmTo600Dpi(row * (diam + padding * 2))
      if (actHeight > height) {
        ElMessage.warning('行数过多，无法排版')
        return
      }

      const arr = []
      for (let i = 0; i < row; i++) {
        const rowArr = []
        for (let j = 0; j < col; j++) {
          rowArr.push('')
        }
        arr.push(rowArr)
      }
      images.value = arr
      tempImages.value = JSON.parse(JSON.stringify(arr))

      submitForm.value = {...ruleForm}
      calcPaper()
    }
  })
}
const calcPaper = () => {
  const {diam, padding, color, width, height} = submitForm.value

  const previewBoxWidth = previewBox.value ? previewBox.value.offsetWidth - 40 : 0
  const previewBoxHeight = previewBox.value ? previewBox.value.offsetHeight - 40 : 0

  let scale = 1
  if (previewBoxWidth / previewBoxHeight > width / height) {
    scale = previewBoxHeight / height
  } else {
    scale = previewBoxWidth / width
  }
  nextTick(() => {
    if (preview.value) {
      preview.value.style.height = `${height}px`
      preview.value.style.width = `${width}px`
      preview.value.style.minHeight = `${height}px`
      preview.value.style.minWidth = `${width}px`
      preview.value.style.maxHeight = `${height}px`
      preview.value.style.maxWidth = `${width}px`
      preview.value.style.transform = `scale(${scale})`
    }
    badgeBg.value.forEach(item => {
      const bgDiam = cmTo600Dpi(diam + padding * 2)
      item.style.width = `${bgDiam}px`
      item.style.height = `${bgDiam}px`
      item.style.background = color
    })
    badge.value.forEach(item => {
      item.style.width = `${cmTo600Dpi(diam)}px`
      item.style.height = `${cmTo600Dpi(diam)}px`
    })
    btnScale.value = 1 / scale
  })
}

onMounted(() => {
  calcPaper()
  window.addEventListener('resize', calcPaper)
})
onUnmounted(() => {
  window.removeEventListener('resize', calcPaper)
})

const fileInput = ref<HTMLInputElement>()
const dialogVisible = ref<boolean>(false)
const rowIndex = ref(0)
const colIndex = ref(0)
const editable = ref('')
const addImage = (i: number, j: number) => {
  editable.value = ''
  rowIndex.value = i
  colIndex.value = j
  const inputDom = fileInput.value
  if (inputDom) {
    inputDom.value = ''
    inputDom.click()
  }
}
const fileChange = (e: any) => {
  const file = e.target.files[0]
  const reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onload = () => {
    images.value[rowIndex.value][colIndex.value] = reader.result as string
    tempImages.value[rowIndex.value][colIndex.value] = reader.result as string
    dialogVisible.value = true
  }
}

const editImage = (i: number, j: number) => {
  editable.value = ''
  rowIndex.value = i
  colIndex.value = j
  dialogVisible.value = true
}
const cropperRef = ref()
const confirmCrop = () => {
  if (!cropperRef.value) {
    return
  }
  const {canvas} = cropperRef.value.getResult() as CropperResult
  images.value[rowIndex.value][colIndex.value] = canvas?.toDataURL() || ''
  dialogVisible.value = false
}
const output = () => {
  if (!preview.value) {
    return
  }
  html2canvas(preview.value, {
    onclone: (_, el: HTMLElement) => {
      el.style.transform = ''
    }
  }).then((canvas: HTMLCanvasElement) => {
    const a = document.createElement('a')
    a.href = canvas.toDataURL()
    a.download = '吧唧图.png'
    a.click()
    a.remove()
  }).catch(err => {
    console.warn(err)
  })
}
</script>

<template>
  <div class="index">
    <div ref="previewBox" class="preview-box">
      <div class="preview" ref="preview">
        <div class="row" v-for="(row, i) of images" :key="i">
          <div ref="badgeBg" class="badge-bg" v-for="(image, j) in row" :key="j">
            <div ref="badge" class="badge" @mouseenter="editable = `${i},${j}`" @mouseleave="editable = ''">
              <img v-if="image" class="image" :src="image" alt="" @click="addImage(i, j)"/>
              <div v-if="!image || editable && +editable.split(',')[0] === i && +editable.split(',')[1] === j"
                   class="btn-box">
                <div v-if="image" class="inner-content">
                  <div class="fake" :style="`width: ${btnScale * 32}px; margin-right: ${btnScale * 10}px;`"></div>
                  <el-button class="real" :style="`transform: translate(-50%, -50%) scale(${btnScale})`" :icon="Edit" circle @click="addImage(i, j)"/>
                </div>
                <div v-else class="inner-content">
                  <div class="fake" :style="`width: ${btnScale * 32}px; margin-right: ${btnScale * 10}px;`"></div>
                  <el-button class="real" :style="`transform: translate(-50%, -50%) scale(${btnScale})`" :icon="Plus" circle @click="addImage(i, j)"/>
                </div>
                <div v-if="tempImages[i][j]" class="inner-content">
                  <div class="fake" :style="`width: ${btnScale * 32}px; margin-right: ${btnScale * 10}px;`"></div>
                  <el-button class="real" :style="`transform: translate(-50%, -50%) scale(${btnScale})`" :icon="Crop" circle @click="editImage(i, j)"/>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="content">
      <h1 class="title">吧唧打印图排版工具</h1>
      <el-form class="form" ref="ruleFormRef" :model="ruleForm" :rules="rules" label-position="left"
               label-width="120px">
        <el-form-item label="纸张大小">
          <el-radio-group v-model="paper">
            <el-radio-button v-for="item in paperSize.entries()" :key="item[0]" :label="item[0]"></el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="paper === '自定义'" label="纸张宽度(像素)" prop="width">
          <el-input-number v-model="ruleForm.width" :precision="2" controls-position="right" :min="0.01"/>
        </el-form-item>
        <el-form-item v-if="paper === '自定义'" label="纸张高度(像素)" prop="height">
          <el-input-number v-model="ruleForm.height" :precision="2" controls-position="right" :min="0.01"/>
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
        <el-form-item label="边框颜色" prop="color">
          <el-color-picker v-model="ruleForm.color"/>
        </el-form-item>
      </el-form>
      <div class="btn-box">
        <el-button class="button" type="primary" @click="onSubmit">生成</el-button>
        <el-button class="button" type="primary" @click="output">导出</el-button>
      </div>
      <p>Tips：纸张宽高为600dpi换算的像素</p>
    </div>
    <el-dialog v-model="dialogVisible" title="裁剪" :close-on-click-modal="false">
      <cropper ref="cropperRef" :src="tempImages[rowIndex][colIndex]"
               :stencil-component="CircleStencil"></cropper>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmCrop">确定</el-button>
        </span>
      </template>
    </el-dialog>
    <input ref="fileInput" type="file" class="file-input" accept="image/*" @change="fileChange"/>
  </div>
</template>

<style scoped>
.index {
  display: flex;
  width: 100%;
  height: 100%;

  .file-input {
    width: 0;
    height: 0;
    opacity: 0;
  }

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
            border-radius: 50%;
            position: relative;

            .image {
              width: 100%;
              height: 100%;
              border-radius: 50%;
            }

            .btn-box {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              background: rgba(0, 0, 0, 0.1);
              .inner-content {
                position: relative;
                &:last-child {
                  margin-right: 0!important;
                }
                .fake {
                  visibility: hidden;
                }
                .real {
                  position: absolute;
                  top: 50%;
                  left: 50%;
                }
              }
            }
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
      margin-top: 40px;
    }

    .btn-box {
      display: flex;
      justify-content: space-evenly;
      align-items: center;
      width:100%;
      margin-top: 40px;
      margin-bottom: 20px;

      .button {
        width: 100px;
        &:first-child {
          margin-right: 10px;
        }
      }
    }
  }
}
</style>
