import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';
import { ExternalGeneratorOptions, GeneratorOptions, InternalGeneratorOptions } from './options';
import { noop, toUnixPath } from './helpers';
import { getBlocksToEmit } from './emit-block';
import path from 'path';
import { CompilerOptions, Project, ScriptTarget, ModuleKind } from 'ts-morph';
import { DmmfDocument } from './dmmf/document';
import generateEnumFromDef, { generateGraphQLEnumFromDef } from './enum';
import { enumsFolderName, modelsFolderName } from './config';
import { generateEnumsBarrelFile, generateGraphQLEnumsBarrelFile, generateGraphQLModelsBarrelFile, generateModelsBarrelFile } from './imports';
import generateObjectTypeClassFromModel, { generateGraphQLTypeFromModel } from './model-type-class';

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
  // console.log(dmmfDocument);
  // console.log(dmmfDocument.datamodel.models);
  console.log(dmmfDocument.schema.outputTypes);
  console.log(dmmfDocument.schema.inputTypes);

  if(dmmfDocument.shouldGenerateBlock("enums")) {
    log("Generating enums...");
    const datamodelEnumNames = dmmfDocument.datamodel.enums.map(
      enumDef => enumDef.typeName,
    );
    dmmfDocument.datamodel.enums.forEach(enumDef =>
      generateGraphQLEnumFromDef(project, baseDirPath, enumDef),
    );
    dmmfDocument.schema.enums
      // skip enums from datamodel
      .filter(enumDef => !datamodelEnumNames.includes(enumDef.typeName))
      .forEach(enumDef => generateGraphQLEnumFromDef(project, baseDirPath, enumDef));
      const emittedEnumNames = [
        ...new Set([
          ...dmmfDocument.schema.enums.map(it => it.typeName),
          ...dmmfDocument.datamodel.enums.map(it => it.typeName),
        ]),
      ];
      const enumsBarrelExportSourceFile = project.createSourceFile(
        path.resolve(baseDirPath, enumsFolderName, "index.ts"),
        undefined,
        { overwrite: true },
      );
      // generateEnumsBarrelFile(enumsBarrelExportSourceFile, emittedEnumNames);
      generateGraphQLEnumsBarrelFile(enumsBarrelExportSourceFile, emittedEnumNames);
  }

  if (dmmfDocument.shouldGenerateBlock("models")) {
    log("Generating models...");
    dmmfDocument.datamodel.models.forEach(model => {
      const modelOutputType = dmmfDocument.schema.outputTypes.find(
        type => type.name === model.name,
      )!;
      console.log(model);
      console.log(modelOutputType);
      return generateGraphQLTypeFromModel(
        project,
        baseDirPath,
        model,
        modelOutputType,
        dmmfDocument,
      );
    });
    const modelsBarrelExportSourceFile = project.createSourceFile(
      path.resolve(baseDirPath, modelsFolderName, "index.ts"),
      undefined,
      { overwrite: true },
    );
    generateGraphQLModelsBarrelFile(
      modelsBarrelExportSourceFile,
      dmmfDocument.datamodel.models.map(it => it.typeName),
    );
  }

  await project.save();
}
