import path from 'path';
import { MethodDeclarationStructure, OptionalKind, Project } from 'ts-morph';

import { crudFolderName, resolversFolderName } from '../config';
import { DmmfDocument } from '../dmmf/document';
import { DMMF } from '../dmmf/types';
import {
  generateArgsImports,
  generateGraphQLInfoImport,
  generateHelpersFileImport,
  generateModelsImports,
  generateOutputsImports,
  generateTypesFileImport
} from '../imports';
import { GeneratorOptions } from '../options';
import { generateCrudResolverClassMethodDeclaration_Server } from './helpers';

export default function generateCrudResolverClassFromMapping_Server(
  project: Project,
  baseDirPath: string,
  mapping: DMMF.ModelMapping,
  model: DMMF.Model,
  dmmfDocument: DmmfDocument,
  generatorOptions: GeneratorOptions,
) {
  const resolverDirPath = path.resolve(
    baseDirPath,
    resolversFolderName,
    crudFolderName,
    model.typeName,
  );
  const filePath = path.resolve(resolverDirPath, `${mapping.resolverName}.ts`);
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  generateGraphQLInfoImport(sourceFile);
  generateArgsImports(
    sourceFile,
    mapping.actions
      .filter(it => it.argsTypeName !== undefined)
      .map(it => it.argsTypeName!),
    0,
  );
  generateHelpersFileImport(sourceFile, 3);
  generateTypesFileImport(sourceFile, 3);

  const distinctOutputTypesNames = [
    ...new Set(mapping.actions.map(it => it.outputTypeName)),
  ];
  const modelOutputTypeNames = distinctOutputTypesNames.filter(typeName =>
    dmmfDocument.isModelTypeName(typeName),
  );
  const otherOutputTypeNames = distinctOutputTypesNames.filter(
    typeName => !dmmfDocument.isModelTypeName(typeName),
  );
  generateModelsImports(sourceFile, modelOutputTypeNames, 2);
  generateOutputsImports(sourceFile, otherOutputTypeNames, 2);

  sourceFile.addClass({
    name: mapping.resolverName,
    isExported: true,
    // decorators: [
    //   {
    //     name: "TypeGraphQL.Resolver",
    //     arguments: [`_of => ${model.typeName}`],
    //   },
    // ],
    methods: mapping.actions.map<OptionalKind<MethodDeclarationStructure>>(
      action =>
        generateCrudResolverClassMethodDeclaration_Server(
          action,
          mapping,
          dmmfDocument,
          generatorOptions,
        ),
    ),
  });
}
