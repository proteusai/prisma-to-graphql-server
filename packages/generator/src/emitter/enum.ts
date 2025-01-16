import { EnumMemberStructure, OptionalKind, Project, VariableDeclarationKind } from 'ts-morph';
import path from 'path';

// import { generateTypeGraphQLImport } from './imports';
import { enumsFolderName, resolversFolderName } from './config';
import { DMMF } from './dmmf/types';
import { convertNewLines } from './helpers';
import { generateGQLImport } from './imports';

// TODO: used by prisma-to-graphql-client
export default function generateEnumFromDef_Server(
  project: Project,
  baseDirPath: string,
  enumDef: DMMF.Enum,
) {
  const dirPath = path.resolve(baseDirPath, resolversFolderName, enumsFolderName);
  const filePath = path.resolve(dirPath, `${enumDef.typeName}.ts`);
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });
  // generateTypeGraphQLImport(sourceFile);

  sourceFile.addEnum({
    isExported: true,
    name: enumDef.typeName,
    ...(enumDef.docs && {
      docs: [{ description: convertNewLines(enumDef.docs) }],
    }),
    members: enumDef.valuesMap.map<OptionalKind<EnumMemberStructure>>(
      ({ name, value }) => ({
        name,
        value,
        // TODO: add support for string enums (values)
        // TODO: add support for enum members docs
      }),
    ),
  });

  // TODO: refactor to AST
//   sourceFile.addStatements([
//     `TypeGraphQL.registerEnumType(${enumDef.typeName}, {
//       name: "${enumDef.typeName}",
//       description: ${enumDef.docs ? `"${enumDef.docs}"` : "undefined"},
//     });`,
//   ]);
}
