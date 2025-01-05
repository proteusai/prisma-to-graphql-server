import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';
import { ExternalGeneratorOptions, GeneratorOptions, InternalGeneratorOptions } from './options';
import { noop, toUnixPath } from './helpers';
import { getBlocksToEmit } from './emit-block';
import path from 'path';
import { CompilerOptions, Project, ScriptTarget, ModuleKind } from 'ts-morph';
import { DmmfDocument } from './dmmf/document';

const baseCompilerOptions: CompilerOptions = {
  target: ScriptTarget.ES2021,
  module: ModuleKind.CommonJS,
  emitDecoratorMetadata: true,
  experimentalDecorators: true,
  esModuleInterop: true,
  skipLibCheck: true,
};

export default async function emitCode(
  dmmf: PrismaDMMF.Document,
  baseOptions: InternalGeneratorOptions & ExternalGeneratorOptions,
  log: (msg: string) => void = noop,
) {
  // TODO: ensureInstalledCorrectPrismaPackage();

  const options: GeneratorOptions = {
    ...baseOptions,
    blocksToEmit: getBlocksToEmit(baseOptions.emitOnly),
    contextPrismaKey: baseOptions.contextPrismaKey ?? "prisma",
    relativePrismaOutputPath: toUnixPath(
      path.relative(baseOptions.outputDirPath, baseOptions.prismaClientPath),
    ),
    absolutePrismaOutputPath:
      !baseOptions.customPrismaImportPath &&
      baseOptions.prismaClientPath.includes("node_modules")
        ? "@prisma/client"
        : undefined,
    formatGeneratedCode: baseOptions.formatGeneratedCode ?? "tsc", // default for backward compatibility
  };
  console.log(options);

  const baseDirPath = options.outputDirPath;
  // TODO: check this variable out: emitTranspiledCode
  const emitTranspiledCode =
    options.emitTranspiledCode ??
    options.outputDirPath.includes("node_modules");
  const project = new Project({
    compilerOptions: {
      ...baseCompilerOptions,
      ...(emitTranspiledCode && {
        declaration: true,
        importHelpers: true,
      }),
    },
  });

  log("Transforming dmmfDocument...");
  const dmmfDocument = new DmmfDocument(dmmf, options);
  console.log(dmmfDocument);

  if(dmmfDocument.shouldGenerateBlock("enums")) {
    log("Generating enums...");
  }
}
