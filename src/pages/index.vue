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

interface ExportForm {
  fileName: string
  fileType: string
  quality: number
  dpi: number
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

const exportForm = reactive<ExportForm>({
  fileName: '吧唧图',
  fileType: 'png',
  quality: 1,
  dpi: 600
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
    scale: exportForm.dpi / 600,
    onclone: (_, el: HTMLElement) => {
      el.style.transform = ''
    }
  }).then((canvas: HTMLCanvasElement) => {
    const a = document.createElement('a')
    a.href = canvas.toDataURL(`image/${exportForm.fileType}`, exportForm.quality)
    a.download = `${exportForm.fileName || '吧唧图'}.${exportForm.fileType}`
    a.click()
    a.remove()
  }).catch(err => {
    console.warn(err)
  })
}

const goGitHub = () => {
  window.open('https://github.com/HaoHaoP/badge-print')
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
      <div class="content-box">
        <el-form class="form" ref="ruleFormRef" :model="ruleForm" :rules="rules" label-position="left"
                 label-width="120px">
          <el-form-item label="纸张大小">
            <el-radio-group v-model="paper">
              <el-radio-button v-for="item in paperSize.entries()" :key="item[0]" :label="item[0]"></el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="paper === '自定义'" label="纸张宽度(像素)" prop="width">
            <el-input-number v-model="ruleForm.width" controls-position="right" :min="0.01"/>
          </el-form-item>
          <el-form-item v-if="paper === '自定义'" label="纸张高度(像素)" prop="height">
            <el-input-number v-model="ruleForm.height" controls-position="right" :min="0.01"/>
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
        <el-form class="form" ref="exportFormRef" :model="exportForm" label-position="left"
                 label-width="120px">
          <el-form-item label="文件名">
            <el-input v-model="exportForm.fileName"/>
          </el-form-item>
          <el-form-item label="文件类型">
            <el-select v-model="exportForm.fileType">
              <el-option label="png" value="png"/>
              <el-option label="jpeg" value="jpeg"/>
            </el-select>
          </el-form-item>
          <el-form-item label="质量">
            <el-slider v-model="exportForm.quality" :min="0.1" :max="1" :step="0.1"
                       :format-tooltip="(value: number) => value * 100 + '%'"/>
          </el-form-item>
          <el-form-item label="DPI">
            <el-select v-model="exportForm.dpi">
              <el-option label="600" :value="600"/>
              <el-option label="400" :value="400"/>
              <el-option label="300" :value="300"/>
              <el-option label="300" :value="200"/>
            </el-select>
          </el-form-item>
        </el-form>
        <div class="btn-box">
          <el-button class="button" type="primary" @click="onSubmit">生成</el-button>
          <el-button class="button" type="primary" @click="output">导出</el-button>
        </div>
        <p>Tips：png格式100%质量600dpi为无压缩</p>
      </div>
      <div class="footer">
        <p class="copyright">Copyright (c) 2023 皓皓P</p>
        <img class="github-icon" src="../assets/github-mark.svg" @click="goGitHub" alt="GitHub"/>
      </div>
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

    .content-box {
      flex: 1;
    }

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
      width: 100%;
      margin-top: 40px;
      margin-bottom: 20px;

      .button {
        width: 100px;

        &:first-child {
          margin-right: 10px;
        }
      }
    }

    .footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      width: 100%;

      .copyright {
        font-size: 12px;
        margin-left: 10px;
      }

      .github-icon {
        width: 1em;
        height: 1em;
        cursor: pointer;
        margin-left: 10px;
      }
    }
  }
}
</style>
