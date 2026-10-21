import { put } from '@vercel/blob';

/**
 * Disco local não serve em ambiente serverless (Vercel): o filesystem é
 * efêmero e cada requisição pode cair numa instância diferente da que
 * escreveu o arquivo — por isso uploads (avatar, portfólio, documento de
 * identidade) vão direto pro Vercel Blob em vez de `diskStorage` do multer.
 * Exige a variável BLOB_READ_WRITE_TOKEN (criada automaticamente ao
 * conectar um Blob Store ao projeto no painel da Vercel).
 */
export async function uploadBuffer(pathname: string, buffer: Buffer, contentType: string) {
  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: true,
  });
  return blob;
}
