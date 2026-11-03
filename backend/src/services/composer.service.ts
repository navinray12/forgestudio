import {createComposerRuntime} from './composer-runtime.js';import {AppError} from '../utils/app-error.js';
export type ComposerStatus={available:boolean;version?:string;phpAvailable:boolean;phpVersion?:string;error?:string};
export async function checkComposerEnvironment():Promise<ComposerStatus>{return createComposerRuntime().diagnose({phpSource:'AUTO',composerSource:'AUTO'});}
export async function validateComposerConfig(_configString:string):Promise<boolean>{throw new AppError('Use authenticated account-scoped Composer validation.',400,'ACCOUNT_CONTEXT_REQUIRED');}
export async function runComposerInstall():Promise<{success:boolean;output:string}>{throw new AppError('Use authenticated account-scoped Composer installation.',400,'ACCOUNT_CONTEXT_REQUIRED');}
