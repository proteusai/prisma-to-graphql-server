import { EnvValue, generatorHandler, GeneratorOptions } from '@prisma/generator-helper'
// import { logger } from '@prisma/sdk'
import path from 'path'
import { promises as asyncFs } from 'fs'
import { GENERATOR_NAME } from './constants'
import { genEnum } from './helpers/genEnum'
import { writeFileSafely } from './utils/writeFileSafely'
import { ExternalGeneratorOptions, InternalGeneratorOptions } from './emitter/options'
import { parseString, parseStringArray, parseStringBoolean, parseStringEnum } from './helpers'
import { ALL_EMIT_BLOCK_KINDS } from './emitter/emit-block'
import emitCode from './emitter/emit-code'
import { parseEnvValue, getDMMF, logger } from '@prisma/internals'

const { version } = require('../package.json')

generatorHandler({
  onManifest() {
    logger.info(`${GENERATOR_NAME}:Registered`)
    return {
      version,
      defaultOutput: '../generated',
      prettyName: GENERATOR_NAME,
    }
  },
  onGenerate: async (options: GeneratorOptions) => {
    console.log(options);
    const outputDir = parseEnvValue(options.generator.output as EnvValue);
    await asyncFs.mkdir(outputDir, { recursive: true });
    // TODO: await removeDir(outputDir, true);

    // const prismaClientProvider = options.otherGenerators.find(
    //   (gen) => parseEnvValue(gen.provider) === 'prisma-client-js',
    // )
    // if (!prismaClientProvider) {
    //   throw new Error('Could not find the "prisma-client-js" provider')
    // }
    // const prismaClientPath = parseEnvValue(prismaClientProvider.output!);
    // const prismaClientDmmf = await getDMMF({
    //   datamodel: options.datamodel,
    //   previewFeatures: prismaClientProvider.previewFeatures,
    // });

    const generatorConfig = options.generator.config;
    const externalConfig: ExternalGeneratorOptions = {
      emitDMMF: parseStringBoolean(generatorConfig.emitDMMF),
      emitTranspiledCode: parseStringBoolean(generatorConfig.emitTranspiledCode),
      simpleResolvers: parseStringBoolean(generatorConfig.simpleResolvers),
      useOriginalMapping: parseStringBoolean(generatorConfig.useOriginalMapping),
      useUncheckedScalarInputs: parseStringBoolean(
        generatorConfig.useUncheckedScalarInputs,
      ),
      emitIdAsIDType: parseStringBoolean(generatorConfig.emitIdAsIDType),
      emitOnly: parseStringArray(
        generatorConfig.emitOnly,
        "emitOnly",
        ALL_EMIT_BLOCK_KINDS,
      ),
      useSimpleInputs: parseStringBoolean(generatorConfig.useSimpleInputs),
      emitRedundantTypesInfo: parseStringBoolean(
        generatorConfig.emitRedundantTypesInfo,
      ),
      customPrismaImportPath: parseString(
        generatorConfig.customPrismaImportPath,
        "customPrismaImportPath",
      ),
      contextPrismaKey: parseString(
        generatorConfig.contextPrismaKey,
        "contextPrismaKey",
      ),
      omitInputFieldsByDefault: parseStringArray(
        generatorConfig.omitInputFieldsByDefault,
        "omitInputFieldsByDefault",
      ),
      omitOutputFieldsByDefault: parseStringArray(
        generatorConfig.omitOutputFieldsByDefault,
        "omitOutputFieldsByDefault",
      ),
      formatGeneratedCode:
        parseStringBoolean(generatorConfig.formatGeneratedCode) ??
        parseStringEnum(
          generatorConfig.formatGeneratedCode,
          "formatGeneratedCode",
          ["prettier", "tsc"] as const,
        ),
      emitIsAbstract: parseStringBoolean(generatorConfig.emitIsAbstract) ?? false,
    };
    const internalConfig: InternalGeneratorOptions = {
      outputDirPath: outputDir,
      prismaClientPath: '', // TODO: prismaClientPath,
    };

    console.log(externalConfig);
    if (externalConfig.emitDMMF) {
      await Promise.all([
        asyncFs.writeFile(
          path.resolve(outputDir, "./dmmf.json"),
          JSON.stringify(options.dmmf, null, 2),
        ),
        // asyncFs.writeFile(
        //   path.resolve(outputDir, "./prisma-client-dmmf.json"),
        //   JSON.stringify(prismaClientDmmf, null, 2),
        // ),
      ]);
    }

    //await emitCode(prismaClientDmmf, {
    await emitCode(options.dmmf, {
      ...externalConfig,
      ...internalConfig,
    });
    return '';

    // -----------------------------------

    // options.dmmf.datamodel.enums.forEach(async (enumInfo) => {
    //   const tsEnum = genEnum(enumInfo)

    //   const writeLocation = path.join(
    //     options.generator.output?.value!,
    //     `${enumInfo.name}.ts`,
    //   )

    //   await writeFileSafely(writeLocation, tsEnum)
    // });
  },
})
