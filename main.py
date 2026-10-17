import argparse
import os
import sys

sys.path.append(os.path.dirname(__file__) + "/..")

from CMC.converter import Converter


def str2bool(v):
    """argparse 布尔参数解析（type=bool 的替代，支持 true/false/1/0）"""
    if isinstance(v, bool):
        return v
    if v.lower() in ("yes", "true", "t", "y", "1"):
        return True
    if v.lower() in ("no", "false", "f", "n", "0"):
        return False
    raise argparse.ArgumentTypeError("Boolean value expected.")


def main():
    parser = argparse.ArgumentParser(
        prog="OpAlign", description="OpAlign - 跨框架模型转换工具（算子语义对齐）"
    )
    parser.add_argument(
        "--in_dir",
        default="./EVALUATION/datasets/models/pytorch/vision/sourceModels/alexnet.py",
        type=str,
        help="the Source DL Model file or directory.",
    )
    parser.add_argument(
        "--source_framework",
        default="pytorch",
        type=str,
        help="the Source framework class of DL Model.",
    )
    parser.add_argument(
        "--out_dir", default=None, type=str, help="the Target DL Model file or directory."
    )
    parser.add_argument(
        "--log_dir", default="./logs/", type=str, help="the log file or directory."
    )
    parser.add_argument(
        "--target_framework",
        default="paddlepaddle",
        type=str,
        help="the Target framework class of DL Model.",
    )
    parser.add_argument(
        "--show_unsupport",
        default=True,
        type=str2bool,
        help="show these APIs which are not supported to convert now",
    )
    args = parser.parse_args()

    assert args.in_dir is not None, "User must specify --in_dir "
    converter = Converter(args.in_dir, args.out_dir, args.log_dir, args.show_unsupport, args.source_framework, args.target_framework)
    converter.run()


if __name__ == '__main__':
    main()
