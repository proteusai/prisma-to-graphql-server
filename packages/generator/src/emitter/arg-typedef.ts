import path from 'path';
import {
    Project,
    VariableDeclarationKind
} from 'ts-morph';

import { argsFolderName } from './config';
import { DmmfDocument } from './dmmf/document';
import { DMMF } from './dmmf/types';
import {
    generateGQLImport
} from './imports';

export default function generateArgsTypeTypeDefFromArgs_Server(
  project: Project,
  generateDirPath: string,
  fields: readonly DMMF.SchemaArg[],
  argsTypeName: string,
  dmmfDocument: DmmfDocument,
  inputImportsLevel = 3,
) {
  const dirPath = path.resolve(generateDirPath, argsFolderName);
  const filePath = path.resolve(dirPath, `${argsTypeName}.ts`);
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  generateGQLImport(sourceFile);

  sourceFile.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
          {
          name: argsTypeName,
          initializer: `gql\`
    input ${argsTypeName} {
        ${fields.map(field => `${field.name}: ${field.typeGraphQLType}`).join('\n        ')}
    }
\``,
          },
      ],
  });
}
