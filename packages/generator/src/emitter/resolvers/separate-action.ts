import path from 'path';
import { Project } from 'ts-morph';

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

export default function generateActionResolverClass_Server(
  project: Project,
  baseDirPath: string,
  model: DMMF.Model,
  action: DMMF.Action,
  mapping: DMMF.ModelMapping,
  dmmfDocument: DmmfDocument,
  generatorOptions: GeneratorOptions,
) {
  const sourceFile = project.createSourceFile(
    path.resolve(
      baseDirPath,
      resolversFolderName,
      crudFolderName,
      model.typeName,
      `${action.actionResolverName}.ts`,
    ),
    undefined,
    { overwrite: true },
  );

  generateGraphQLInfoImport(sourceFile);
  if (action.argsTypeName) {
    generateArgsImports(sourceFile, [action.argsTypeName], 0);
  }
  generateModelsImports(
    sourceFile,
    [model.typeName, action.outputTypeName].filter(typeName =>
      dmmfDocument.isModelTypeName(typeName),
    ),
    2,
  );
  generateOutputsImports(
    sourceFile,
    [action.outputTypeName].filter(
      typeName => !dmmfDocument.isModelTypeName(typeName),
    ),
    2,
  );
  generateHelpersFileImport(sourceFile, 3);
  generateTypesFileImport(sourceFile, 3);

  sourceFile.addClass({
    name: action.actionResolverName,
    isExported: true,
    // decorators: [
    //   {
    //     name: "TypeGraphQL.Resolver",
    //     arguments: [`_of => ${model.typeName}`],
    //   },
    // ],
    methods: [
      generateCrudResolverClassMethodDeclaration_Server(
        action,
        mapping,
        dmmfDocument,
        generatorOptions,
      ),
    ],
  });
}
