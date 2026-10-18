import collections
import os
import textwrap


def singleton(cls):
    """按类缓存单例；当再次以不同的 fileName 构造时重置状态，避免跨转换串目录"""
    instances = {}

    def get_instance(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        else:
            new_name = kwargs.get("fileName") or (args[0] if args else None)
            inst = instances[cls]
            if new_name and getattr(inst, "fileName", None) != new_name:
                inst.__init__(*args, **kwargs)
        return instances[cls]

    return get_instance


@singleton
class commonGenerateHelper:
    def __init__(self, fileName=None, *args, **kwargs):
        self.fileName = fileName
        self.ids = collections.defaultdict(bool)
        # Indicates whether the template code has been written
        self.code_written = False

    def generate_model_code(self, code, target_api, targetClass="paddle"):
        if not self.fileName:
            return
        if not self.code_written:
            CODE_CONTENT = textwrap.dedent(
                """
                #the  Common model file template, please Don't edit it!
                import {}
                """.format(targetClass)
            )
            # Create the initial file
            if not os.path.exists(os.path.dirname(self.fileName)):
                os.makedirs(os.path.dirname(self.fileName))

            with open(self.fileName, "w") as file:
                file.write(CODE_CONTENT)

            self.code_written = True

        if self.ids[target_api] == 0:
            with open(self.fileName, "a") as file:
                file.write(code)

        self.ids[target_api] += 1

    def generate_pythonLibrary_code(self, ):
        pass

    def generate_CLibrary_code(self):
        pass
