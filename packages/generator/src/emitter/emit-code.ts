import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';
import { ExternalGeneratorOptions, GeneratorOptions, InternalGeneratorOptions } from './options';
import { noop, toUnixPath } from './helpers';
import { getBlocksToEmit } from './emit-block';
import path from 'path';
import { CompilerOptions, Project, ScriptTarget, ModuleKind } from 'ts-morph';
import { DmmfDocument } from './dmmf/document';
import generateEnumFromDef_Server from './enum';
import { argsFolderName, crudFolderName, enumsFolderName, inputsFolderName, modelsFolderName, outputsFolderName, relationsResolversFolderName, resolversFolderName, typeDefsFolderName } from './config';
import { generateArgsBarrelFile, generateArgsIndexFile, generateEnumsBarrelFile, generateGraphQLEnumsBarrelFile, generateGraphQLModelsBarrelFile, generateIndexFile_GqlServer, generateInputsBarrelFile, generateModelsBarrelFile, generateOutputsBarrelFile, generateResolversActionsBarrelFile, generateResolversBarrelFile, generateResolversIndexFile, generateTypeDefsBarrelFile, generateTypeDefsIndexFile } from './imports';
import generateObjectTypeClassFromModel_Server from './model-type-class';
import { DMMF } from './dmmf/types';
import { generateInputTypeClassFromType, generateOutputTypeClassFromType } from './type-class';
import generateArgsTypeClassFromArgs_Server from './args-class';
import generateRelationsResolverClassesFromModel from './resolvers/relations';
import { GenerateMappingData } from './types';
import generateCrudResolverClassFromMapping_Server from './resolvers/full-crud';
import generateActionResolverClass_Server from './resolvers/separate-action';
import { generateEnhanceMap as generateEnhanceMap_GqlServer } from './emit-enhance';
import { generateCustomScalars as generateCustomScalars_GqlServer } from './emit-scalars';
import { generateHelpersFile_GqlServer } from './emit-helpers';
import generateCrudTypeDefClassFromMapping_GqlServer from './typedefs/full-crud';
import { generateTypesFile_GqlServer } from './emit-types';
import generateArgsTypeTypeDefFromArgs_Server from './arg-typedef';
import generateEnumFromDef_GqlServer from './enum-typedef';
import { generateObjectTypeDefFromModel_GqlServer } from './model-type-typedef';

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
    dmmfDocument.datamodel.enums.forEach(enumDef => {
      generateEnumFromDef_Server(project, baseDirPath, enumDef);
      generateEnumFromDef_GqlServer(project, baseDirPath, enumDef);
    });
    dmmfDocument.schema.enums
      // skip enums from datamodel
      .filter(enumDef => !datamodelEnumNames.includes(enumDef.typeName))
      .forEach(enumDef => {
        generateEnumFromDef_Server(project, baseDirPath, enumDef);
        generateEnumFromDef_GqlServer(project, baseDirPath, enumDef);
      });
      const emittedEnumNames = [
        ...new Set([
          ...dmmfDocument.schema.enums.map(it => it.typeName),
          ...dmmfDocument.datamodel.enums.map(it => it.typeName),
        ]),
      ];
      const enumsBarrelExportSourceFile = project.createSourceFile(
        path.resolve(baseDirPath, resolversFolderName, enumsFolderName, "index.ts"),
        undefined,
        { overwrite: true },
      );
      // generateEnumsBarrelFile(enumsBarrelExportSourceFile, emittedEnumNames);
      generateEnumsBarrelFile(enumsBarrelExportSourceFile, emittedEnumNames);
  }

  if (dmmfDocument.shouldGenerateBlock("models")) {
    log("Generating models...");
    dmmfDocument.datamodel.models.forEach(model => {
      const modelOutputType = dmmfDocument.schema.outputTypes.find(
        type => type.name === model.name,
      )!;
      // console.log(model);
      // console.log(modelOutputType);
      generateObjectTypeClassFromModel_Server(
        project,
        baseDirPath,
        model,
        modelOutputType,
        dmmfDocument,
      );
      generateObjectTypeDefFromModel_GqlServer(
        project,
        baseDirPath,
        model,
        modelOutputType,
        dmmfDocument,
      );
    });
    const modelsBarrelExportSourceFile = project.createSourceFile(
      path.resolve(baseDirPath, resolversFolderName, modelsFolderName, "index.ts"),
      undefined,
      { overwrite: true },
    );
    generateModelsBarrelFile(
      modelsBarrelExportSourceFile,
      dmmfDocument.datamodel.models.map(it => it.typeName),
    );
  }

  const resolversDirPath = path.resolve(baseDirPath, resolversFolderName);
  let outputTypesToGenerate: DMMF.OutputType[] = [];
  if (dmmfDocument.shouldGenerateBlock("outputs")) {
    log("Generating output types...");
    const rootTypes = dmmfDocument.schema.outputTypes.filter(type =>
      ["Query", "Mutation"].includes(type.name),
    );
    const modelNames = dmmfDocument.datamodel.models.map(model => model.name);
    outputTypesToGenerate = dmmfDocument.schema.outputTypes.filter(
      // skip generating models and root resolvers
      type => !modelNames.includes(type.name) && !rootTypes.includes(type),
    );
    // console.log(outputTypesToGenerate);
    const outputTypesFieldsArgsToGenerate = outputTypesToGenerate
      .map(it => it.fields)
      .reduce((a, b) => a.concat(b), [])
      .filter(it => it.argsTypeName);
    // console.log(outputTypesFieldsArgsToGenerate);
    outputTypesToGenerate.forEach(type =>
      generateOutputTypeClassFromType(
        project,
        resolversDirPath,
        type,
        dmmfDocument,
      ),
    );
    const outputsBarrelExportSourceFile = project.createSourceFile(
      path.resolve(
        baseDirPath,
        resolversFolderName,
        outputsFolderName,
        "index.ts",
      ),
      undefined,
      { overwrite: true },
    );
    generateOutputsBarrelFile(
      outputsBarrelExportSourceFile,
      outputTypesToGenerate.map(it => it.typeName),
      outputTypesFieldsArgsToGenerate.length > 0,
    );

    if (outputTypesFieldsArgsToGenerate.length > 0) {
      log("Generating output types args...");
      outputTypesFieldsArgsToGenerate.forEach(async field => {
        generateArgsTypeClassFromArgs_Server(
          project,
          path.resolve(resolversDirPath, outputsFolderName),
          field.args,
          field.argsTypeName!,
          dmmfDocument,
          2,
        );
      });
      const outputsArgsBarrelExportSourceFile = project.createSourceFile(
        path.resolve(
          baseDirPath,
          resolversFolderName,
          outputsFolderName,
          argsFolderName,
          "index.ts",
        ),
        undefined,
        { overwrite: true },
      );
      generateArgsBarrelFile(
        outputsArgsBarrelExportSourceFile,
        outputTypesFieldsArgsToGenerate.map(it => it.argsTypeName!),
      );
    }
  }

  if (dmmfDocument.shouldGenerateBlock("inputs")) {
    log("Generating input types...");
    // console.log(dmmfDocument.schema.inputTypes);
    dmmfDocument.schema.inputTypes.forEach(type =>
      generateInputTypeClassFromType(project, resolversDirPath, type, options),
    );
    const inputsBarrelExportSourceFile = project.createSourceFile(
      path.resolve(
        baseDirPath,
        resolversFolderName,
        inputsFolderName,
        "index.ts",
      ),
      undefined,
      { overwrite: true },
    );
    generateInputsBarrelFile(
      inputsBarrelExportSourceFile,
      dmmfDocument.schema.inputTypes.map(it => it.typeName),
    );
  }

  if (
    dmmfDocument.relationModels.length > 0 &&
    dmmfDocument.shouldGenerateBlock("relationResolvers")
  ) {
    log("Generating relation resolvers...");
    // console.log(dmmfDocument.relationModels);
    dmmfDocument.relationModels.forEach(relationModel =>
      generateRelationsResolverClassesFromModel(
        project,
        baseDirPath,
        dmmfDocument,
        relationModel,
        options,
      ),
    );
    const relationResolversBarrelExportSourceFile = project.createSourceFile(
      path.resolve(
        baseDirPath,
        resolversFolderName,
        relationsResolversFolderName,
        "resolvers.index.ts",
      ),
      undefined,
      { overwrite: true },
    );
    generateResolversBarrelFile(
      relationResolversBarrelExportSourceFile,
      dmmfDocument.relationModels.map<GenerateMappingData>(relationModel => ({
        resolverName: relationModel.resolverName,
        modelName: relationModel.model.typeName,
      })),
    );

    log("Generating relation resolver args...");
    dmmfDocument.relationModels.forEach(async relationModelData => {
      const resolverDirPath = path.resolve(
        baseDirPath,
        resolversFolderName,
        relationsResolversFolderName,
        relationModelData.model.typeName,
      );
      relationModelData.relationFields
        .filter(field => field.argsTypeName)
        .forEach(async field => {
          generateArgsTypeClassFromArgs_Server(
            project,
            resolverDirPath,
            field.outputTypeField.args,
            field.argsTypeName!,
            dmmfDocument,
          );
        });
      const argTypeNames = relationModelData.relationFields
        .filter(it => it.argsTypeName !== undefined)
        .map(it => it.argsTypeName!);

      if (argTypeNames.length) {
        const barrelExportSourceFile = project.createSourceFile(
          path.resolve(resolverDirPath, argsFolderName, "index.ts"),
          undefined,
          { overwrite: true },
        );
        generateArgsBarrelFile(barrelExportSourceFile, argTypeNames);
      }
    });

    const relationModelsWithArgs = dmmfDocument.relationModels.filter(
      relationModelData =>
        relationModelData.relationFields.some(
          it => it.argsTypeName !== undefined,
        ),
    );
    if (relationModelsWithArgs.length > 0) {
      const relationResolversArgsIndexSourceFile = project.createSourceFile(
        path.resolve(
          baseDirPath,
          resolversFolderName,
          relationsResolversFolderName,
          "args.index.ts",
        ),
        undefined,
        { overwrite: true },
      );
      generateArgsIndexFile(
        relationResolversArgsIndexSourceFile,
        relationModelsWithArgs.map(
          relationModelData => relationModelData.model.typeName,
        ),
      );
    }
    const relationResolversIndexSourceFile = project.createSourceFile(
      path.resolve(
        baseDirPath,
        resolversFolderName,
        relationsResolversFolderName,
        "index.ts",
      ),
      undefined,
      { overwrite: true },
    );
    generateResolversIndexFile(
      relationResolversIndexSourceFile,
      "relations",
      relationModelsWithArgs.length > 0,
    );
  }
// ********************************************************************************************************************
  if (dmmfDocument.shouldGenerateBlock("crudResolvers")) {
    log("Generating crud resolvers...");
    console.log(dmmfDocument.modelMappings);
    dmmfDocument.modelMappings.forEach(async mapping => {
      const model = dmmfDocument.datamodel.models.find(
        model => model.name === mapping.modelName,
      )!;
      generateCrudResolverClassFromMapping_Server(
        project,
        baseDirPath,
        mapping,
        model,
        dmmfDocument,
        options,
      );
      generateCrudTypeDefClassFromMapping_GqlServer(
        project,
        baseDirPath,
        mapping,
        model,
        dmmfDocument,
        options,
      );
      mapping.actions.forEach(async action => {
        const model = dmmfDocument.datamodel.models.find(
          model => model.name === mapping.modelName,
        )!;
        generateActionResolverClass_Server(
          project,
          baseDirPath,
          model,
          action,
          mapping,
          dmmfDocument,
          options,
        );
      });
    });
    const generateMappingData =
      dmmfDocument.modelMappings.map<GenerateMappingData>(mapping => {
        const model = dmmfDocument.datamodel.models.find(
          model => model.name === mapping.modelName,
        )!;
        return {
          modelName: model.typeName,
          resolverName: mapping.resolverName,
          actionResolverNames: mapping.actions.map(it => it.actionResolverName),
        };
      });
    const crudResolversBarrelExportSourceFile = project.createSourceFile(
      path.resolve(
        baseDirPath,
        resolversFolderName,
        crudFolderName,
        "resolvers-crud.index.ts",
      ),
      undefined,
      { overwrite: true },
    );
    generateResolversBarrelFile(
      crudResolversBarrelExportSourceFile,
      generateMappingData,
    );
    const crudTypeDefsBarrelExportSourceFile = project.createSourceFile(
      path.resolve(
        baseDirPath,
        typeDefsFolderName,
        crudFolderName,
        "typedefs-crud.index.ts",
      ),
      undefined,
      { overwrite: true },
    );
    generateTypeDefsBarrelFile(
      crudTypeDefsBarrelExportSourceFile,
      generateMappingData,
    );
    const crudResolversActionsBarrelExportSourceFile = project.createSourceFile(
      path.resolve(
        baseDirPath,
        resolversFolderName,
        crudFolderName,
        "resolvers-actions.index.ts",
      ),
      undefined,
      { overwrite: true },
    );
    generateResolversActionsBarrelFile(
      crudResolversActionsBarrelExportSourceFile,
      generateMappingData,
    );
    const crudResolversIndexSourceFile = project.createSourceFile(
      path.resolve(
        baseDirPath,
        resolversFolderName,
        crudFolderName,
        "index.ts",
      ),
      undefined,
      { overwrite: true },
    );
    generateResolversIndexFile(crudResolversIndexSourceFile, "crud", true);
    const crudTypeDefsIndexSourceFile = project.createSourceFile(
      path.resolve(
        baseDirPath,
        typeDefsFolderName,
        crudFolderName,
        "index.ts",
      ),
      undefined,
      { overwrite: true },
    );
    generateTypeDefsIndexFile(crudTypeDefsIndexSourceFile, "crud", true);

    log("Generating crud resolvers args...");
    dmmfDocument.modelMappings.forEach(async mapping => {
      const actionsWithArgs = mapping.actions.filter(
        it => it.argsTypeName !== undefined,
      );

      if (actionsWithArgs.length) {
        const model = dmmfDocument.datamodel.models.find(
          model => model.name === mapping.modelName,
        )!;
        const resolverDirPath = path.resolve(
          baseDirPath,
          resolversFolderName,
          crudFolderName,
          model.typeName,
        );
        actionsWithArgs.forEach(async action => {
          generateArgsTypeClassFromArgs_Server(
            project,
            resolverDirPath,
            action.method.args,
            action.argsTypeName!,
            dmmfDocument,
          );
        });
        const barrelExportSourceFile = project.createSourceFile(
          path.resolve(resolverDirPath, argsFolderName, "index.ts"),
          undefined,
          { overwrite: true },
        );
        generateArgsBarrelFile(
          barrelExportSourceFile,
          actionsWithArgs.map(it => it.argsTypeName!),
        );

        // ********** Generate args for typedefs ********

        const typedefDirPath = path.resolve(
          baseDirPath,
          typeDefsFolderName,
          crudFolderName,
          model.typeName,
        );
        actionsWithArgs.forEach(async action => {
          generateArgsTypeTypeDefFromArgs_Server(
            project,
            typedefDirPath,
            action.method.args,
            action.argsTypeName!,
            dmmfDocument,
          );
        });
        const barrelExportSourceFile2 = project.createSourceFile(
          path.resolve(typedefDirPath, argsFolderName, "index.ts"),
          undefined,
          { overwrite: true },
        );
        generateArgsBarrelFile(
          barrelExportSourceFile2,
          actionsWithArgs.map(it => it.argsTypeName!),
        );
      }
    });
    const crudResolversArgsIndexSourceFile = project.createSourceFile(
      path.resolve(
        baseDirPath,
        resolversFolderName,
        crudFolderName,
        "args.index.ts",
      ),
      undefined,
      { overwrite: true },
    );
    generateArgsIndexFile(
      crudResolversArgsIndexSourceFile,
      dmmfDocument.modelMappings
        .filter(mapping =>
          mapping.actions.some(it => it.argsTypeName !== undefined),
        )
        .map(mapping => mapping.modelTypeName),
    );
    // ********** Generate args for typedefs ********
    const crudTypeDefsArgsIndexSourceFile = project.createSourceFile(
      path.resolve(
        baseDirPath,
        typeDefsFolderName,
        crudFolderName,
        "args.index.ts",
      ),
      undefined,
      { overwrite: true },
    );
    generateArgsIndexFile(
      crudTypeDefsArgsIndexSourceFile,
      dmmfDocument.modelMappings
        .filter(mapping =>
          mapping.actions.some(it => it.argsTypeName !== undefined),
        )
        .map(mapping => mapping.modelTypeName),
    );
  }

  log("Generate enhance map");
  const enhanceSourceFile = project.createSourceFile(
    baseDirPath + "/enhance.ts",
    undefined,
    { overwrite: true },
  );
  generateEnhanceMap_GqlServer(
    enhanceSourceFile,
    dmmfDocument,
    dmmfDocument.modelMappings,
    dmmfDocument.relationModels,
    dmmfDocument.datamodel.models,
    dmmfDocument.schema.inputTypes,
    outputTypesToGenerate,
  );

  log("Generate custom scalars");
  const scalarsSourceFile = project.createSourceFile(
    baseDirPath + "/scalars.ts",
    undefined,
    { overwrite: true },
  );
  generateCustomScalars_GqlServer(scalarsSourceFile, dmmfDocument.options);

  log("Generate custom types");
  const typesSourceFile = project.createSourceFile(
    baseDirPath + "/types.ts",
    undefined,
    { overwrite: true },
  );
  generateTypesFile_GqlServer(typesSourceFile, dmmfDocument.options);

  log("Generate custom helpers");
  const helpersSourceFile = project.createSourceFile(
    baseDirPath + "/helpers.ts",
    undefined,
    { overwrite: true },
  );
  generateHelpersFile_GqlServer(helpersSourceFile, dmmfDocument.options);

  log("Generating index file");
  const indexSourceFile = project.createSourceFile(
    baseDirPath + "/index.ts",
    undefined,
    { overwrite: true },
  );
  generateIndexFile_GqlServer(
    indexSourceFile,
    dmmfDocument.relationModels.length > 0,
    dmmfDocument.options.blocksToEmit,
  );

  log("Emitting generated code files");
  if (emitTranspiledCode) {
    await project.emit();
  } else {
    if (options.formatGeneratedCode === "tsc") {
      for (const file of project.getSourceFiles()) {
        file.formatText({ indentSize: 2 });
      }
    }
    await project.save();
    // if (options.formatGeneratedCode === "prettier") {
    //   await execa(
    //     `npx prettier --write --ignore-path .prettierignore ${baseDirPath}`,
    //   );
    // }
  }
}
