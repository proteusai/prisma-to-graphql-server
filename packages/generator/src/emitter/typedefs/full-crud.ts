import path from 'path';
import { Project, VariableDeclarationKind } from 'ts-morph';

import { crudFolderName, typeDefsFolderName } from '../config';
import { DmmfDocument } from '../dmmf/document';
import { DMMF } from '../dmmf/types';
import {
    generateGQLImport
} from '../imports';
import { GeneratorOptions } from '../options';

export default function generateCrudTypeDefClassFromMapping_GqlServer(
  project: Project,
  baseDirPath: string,
  mapping: DMMF.ModelMapping,
  model: DMMF.Model,
  dmmfDocument: DmmfDocument,
  generatorOptions: GeneratorOptions,
) {
  const typedefDirPath = path.resolve(
    baseDirPath,
    typeDefsFolderName,
    crudFolderName,
    model.typeName,
  );
  const filePath = path.resolve(typedefDirPath, `${mapping.resolverName.replace('Resolver', 'TypeDef')}.ts`);
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  generateGQLImport(sourceFile);

  const queryActions = mapping.actions.filter(
    action => action.operation === 'Query',
  );
  const mutationActions = mapping.actions.filter(
    action => action.operation === 'Mutation',
  );

  sourceFile.addVariableStatement({
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
        {
        name: mapping.resolverName.replace('Resolver', 'TypeDef'),
        initializer: `gql\`
    type Query {
      ${queryActions.map(action => `${action.name}(args: ${action.argsTypeName}): ${action.typeGraphQLType}`).join('\n      ')}
    }

    type Mutation {
      ${mutationActions.map(action => `${action.name}(args: ${action.argsTypeName}): ${action.typeGraphQLType}`).join('\n      ')}
    }
    \``,
        },
    ],
});
}
