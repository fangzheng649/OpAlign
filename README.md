# OpAlign — 跨框架模型转换工具（算子语义对齐）

OpAlign 是一个**源代码级**的深度学习模型跨框架转换工具。与仅做 API 名称/参数映射的传统方案不同，OpAlign 在**算子语义层**处理框架差异：项目组对 1,349 个算子的实证分析表明，47% 的算子存在语义层面差异，而 74% 的模型转换错误正源于此类不一致。OpAlign 针对三类不一致分别处理，逐层对齐框架实现，保证转换后模型可执行、输出一致。

| 不一致类型 | 占比 | 处理策略 |
|-----------|------|---------|
| 语法不一致（函数路径/参数名/返回类型不同） | 53% | API 映射表直接改写 |
| 语义不一致（实现逻辑差异导致输出冲突） | 36% | 按需分层对齐：Python 层源码补丁 / C 层动态库替换 |
| 算子缺失（目标框架无对应算子） | 11% | 追踪调用栈，用目标框架算子合成等价表达式 |

## 功能

- **CLI 转换器**：`python main.py --in_dir <源文件/目录> --out_dir <输出目录>`，将 PyTorch 模型代码转换为 PaddlePaddle（含反向映射表）
- **语义补丁机制**：语义不一致算子自动在框架源码层面打补丁，持久化为 `modified_XXX.py`（Python 层）或编译为动态库（C 层）
- **缺失算子构建**：如 `torch.addcdiv` 在 Paddle 中不存在时，自动合成 `paddle.add(value, paddle.multiply(value, paddle.divide(t1, t2)))`
- **Web 工作台**：示例模型浏览、源码↔产物行级 diff、语义补丁查看、541 条算子映射表检索
- **评测套件**：算子等价性（MAE/RMSE）、与基线工具对比、鲁棒性实验等四组实验脚本与数据集

## 快速开始

### 环境要求

- Python ≥ 3.10
- **PyTorch 与 PaddlePaddle**（转换过程需运行时导入两个框架以反射算子签名）
- CMake ≥ 3.15（仅当转换涉及 C 层语义补丁时需要；该环节目前仅支持 Linux）

### 1. 安装依赖

```bash
# 核心转换依赖
pip install astor==0.8.1 numpy

# 两个深度学习框架（按需选择版本，实验环境为 PyTorch 2.0.1 / Paddle 2.5.2）
pip install torch
pip install paddlepaddle

# 如需运行 EVALUATION 下的实验脚本
pip install -r requirements.txt
```

### 2. CLI 转换

```bash
# 转换单个模型文件
python main.py --in_dir EVALUATION/datasets/models/pytorch/vision/sourceModels/densenet.py \
               --out_dir output/densenet \
               --show_unsupport true

# 转换整个目录（支持多文件模型包，自动递归）
python main.py --in_dir EVALUATION/datasets/models/pytorch/vision/sourceModels/convnext \
               --out_dir output/convnext
```

参数说明：

| 参数 | 默认 | 说明 |
|------|------|------|
| `--in_dir` | 示例 alexnet | 源框架模型文件或目录 |
| `--out_dir` | 由 in_dir 推导 | 输出目录 |
| `--source_framework` | pytorch | 源框架 |
| `--target_framework` | paddlepaddle | 目标框架 |
| `--log_dir` | ./logs/ | 日志目录（`disable` 关闭） |
| `--show_unsupport` | true | 打印不支持转换的 API 列表 |

转换完成后在 `--out_dir` 得到目标框架代码。**运行转换产物**：

```bash
# 产物不含动态库时
python xxxx.py

# 产物含 .so 时（Linux，C 层语义补丁）
LD_PRELOAD=/path/to/build/libmodified_xxx.so python xxxx.py
```

> **C 层补丁注意事项**：首次使用需编辑 `CMC/paddle_CMakeLists_template.txt`（或 pytorch 版）中以 `**...**` 标注的自定义依赖路径（Eigen3、框架头文件等），该环节依赖 cmake + make，目前仅支持 Linux。

### 3. Web 工作台（可选）

```bash
# 终端 1：启动后端 API（端口 8100）
pip install fastapi uvicorn
uvicorn server.app:app --port 8100

# 终端 2：启动前端
cd web
npm install
npm run dev
```

访问 **http://localhost:3000**：

| 页面 | 功能 |
|------|------|
| 总览 | 工具介绍、方法流程、映射规则/示例模型统计 |
| 转换工作台 | 按领域浏览示例模型，查看源码↔产物行级 diff 高亮、语义补丁文件 |
| 算子映射 | 检索 541 条 PyTorch→PaddlePaddle 映射规则（含映射类型、variantCode 标注） |

> 后端未安装 PyTorch / PaddlePaddle 时，工作台自动进入**演示模式**，浏览 `EVALUATION` 中预置的转换产物；两个框架均安装后，`POST /api/convert` 可执行真实转换。

## 项目结构

```
OpAlign/
├── main.py                     # CLI 入口
├── CMC/                        # 核心转换器
│   ├── converter.py            #   转换编排（遍历、统计、输出）
│   ├── astAnalysis.py          #   AST 三遍分析（import → grad → 算子调用）
│   ├── nodeBase.py             #   节点基础设施 + BaseMatcher（参数反射、补丁调度）
│   ├── codeGeneration.py       #   输出目录公共生成文件管理
│   ├── special_mapping.py      #   特殊模块映射常量
│   ├── utils.py                #   框架源码反射、补丁持久化、CMake 生成与编译
│   ├── Matchers/               #   各类 Matcher（直接映射/参数改写/算子序列合成...）
│   ├── pytorch_to_paddlepaddle.json   # 正向算子映射表（541 条，含 variantCode）
│   ├── paddlepaddle_to_pytorch.json   # 反向映射表（140 条）
│   └── *_CMakeLists_template.txt      # C 层补丁编译模板（需手填依赖路径）
├── server/                     # FastAPI Web API
├── web/                        # Next.js 前端（蓝白科技风工作台）
└── EVALUATION/                 # 评测实验
    ├── datasets/
    │   ├── models/             #   69 个源模型 + 转换产物（vision/text/audio）
    │   └── operators/          #   145 个算子等价性测试文件
    ├── EquivalenceExperiment/  #   算子转换等价性（MAE/RMSE）
    ├── EffectivenessExperiment/#   与 ONNX/PaConvert 对比
    ├── LLMsExperiment/         #   与 LLM 直接转换对比
    └── RobustnessExperiment/   #   跨领域鲁棒性（vision/text/audio）
```

## 评测

**算子转换可靠性**（686 个算子采样）：总体成功率 91%（624/686），其中 TensorOps 97.1%、LayerOps 99.0%；转换算子输出的 MAE/RMSE 均低于 1×10⁻⁴ 阈值。

**与现有方法对比**（18 个视觉模型）：对无语义不一致的模型（AlexNet/VGG）与基线持平；对存在语义不一致的模型（DenseNet/ShuffleNet 等，ONNX 与 PaConvert 均不支持），本工具是唯一能完成转换并保持精度（F1）的方案。

**鲁棒性**（52 个模型，视觉/文本/音频三领域）：全部领域 Metric Gap < 3.4%，均优于 ONNX 与 PaConvert 基线。

**泛化性**：方法同样适用于 PyTorch→TensorFlow（18 模型 94.4% 成功）与 PyTorch→MXNet（78%）方向。

运行评测（以算子等价性为例）：

```bash
cd EVALUATION/EquivalenceExperiment
python test_operatorEquivalence_pipeline.py --all
```

## 已知限制

- C 层语义补丁（动态库编译）目前仅支持 Linux，Windows 下纯 AST 转换路径可用
- `CMC/*_CMakeLists_template.txt` 中的依赖路径为占位符，触发 C 层补丁前需手工填写
- 映射表需随框架版本演进维护（当前基于 PyTorch 2.0.1 / Paddle 2.5.2 构建）
- 少量框架特有机制算子（如 TorchScript 相关）暂不支持，转换时会列入 Not Support 列表

## License

MIT

> 注：`EVALUATION/datasets/models/paddlepaddle/` 下的部分模型文件源自 PaddlePaddle（Apache-2.0），`wav2vec2/wavlm_attention.py` 源自 Microsoft（MIT），其原始许可声明保留在文件头部，遵循各自许可证。
