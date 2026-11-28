<?php
/**
 * ============================================================================
 * Mpdownloader — Backend PHP para cPanel (Zero Dependências Externas)
 * ============================================================================
 * Compatível com hospedagens compartilhadas cPanel (PHP 7.4+ / 8.x)
 * Extensões padrão: cURL (ou allow_url_fopen) + ZipArchive
 * Inclui proteção SSRF contra IPs privados/localhost e limpeza automática de temp.
 * ============================================================================
 */

@ini_set('max_execution_time', '180');
@ini_set('memory_limit', '256M');
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING & ~E_DEPRECATED);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$action = isset($_GET['action']) ? trim($_GET['action']) : 'health';

function jsonResponse($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function getTempStorageDir() {
    $dir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'mpdownloader_zips';
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    if (!is_writable($dir)) {
        $dir = __DIR__ . DIRECTORY_SEPARATOR . '.tmp_zips';
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
    }
    return $dir;
}

function cleanupOldZips($dir, $maxAgeSeconds = 1200) {
    if (!is_dir($dir)) return;
    $now = time();
    foreach (glob($dir . DIRECTORY_SEPARATOR . '*.zip') ?: [] as $file) {
        if ($now - @filemtime($file) > $maxAgeSeconds) {
            @unlink($file);
            @unlink($file . '.meta');
        }
    }
}

/* ============================================================================
   PROTEÇÃO SSRF (Bloqueia localhost e redes privadas em servidor público)
   ============================================================================ */
function isPrivateOrReservedHost($host) {
    $h = strtolower(trim($host));
    if ($h === '' || $h === 'localhost' || substr($h, -6) === '.local') {
        return true;
    }
    $ip = filter_var($h, FILTER_VALIDATE_IP) ? $h : @gethostbyname($h);
    if (!filter_var($ip, FILTER_VALIDATE_IP)) {
        return true;
    }
    // Bloqueia faixas privadas e reservadas (10.x, 127.x, 172.16-31.x, 192.168.x, 169.254.x)
    $isPublic = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
    return $isPublic === false;
}

/* ============================================================================
   HEALTHCHECK
   ============================================================================ */
if ($action === 'health') {
    jsonResponse([
        'ok' => true,
        'service' => 'Mpdownloader',
        'engine' => 'php',
        'phpVersion' => PHP_VERSION,
        'curlAvailable' => function_exists('curl_init'),
        'zipAvailable' => class_exists('ZipArchive')
    ]);
}

/* ============================================================================
   DOWNLOAD DO ARQUIVO .ZIP
   ============================================================================ */
if ($action === 'download') {
    $id = isset($_GET['id']) ? preg_replace('/[^a-f0-9]/', '', $_GET['id']) : '';
    if (strlen($id) < 8) {
        http_response_code(400);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'ID de download inválido.';
        exit;
    }

    $dir = getTempStorageDir();
    $zipPath = $dir . DIRECTORY_SEPARATOR . $id . '.zip';
    $metaPath = $zipPath . '.meta';

    if (!is_file($zipPath)) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Arquivo ZIP expirado ou não encontrado. Faça uma nova captura.';
        exit;
    }

    $filename = 'mpdownloader_site.zip';
    if (is_file($metaPath)) {
        $meta = @json_decode(@file_get_contents($metaPath), true);
        if (!empty($meta['filename'])) {
            $filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $meta['filename']);
        }
    }

    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . filesize($zipPath));
    header('Cache-Control: no-store');
    readfile($zipPath);
    exit;
}

/* ============================================================================
   HELPERS DE FETCH & URL
   ============================================================================ */
function fetchUrlBinary($url, $timeout = 15, $maxBytes = 8388608, $isDocument = false) {
    $ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
    $headers = $isDocument
        ? [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language: pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Upgrade-Insecure-Requests: 1'
          ]
        : [
            'Accept: */*',
            'Accept-Language: pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
          ];

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 5,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_USERAGENT => $ua,
            CURLOPT_ENCODING => '',
            CURLOPT_HTTPHEADER => $headers
        ]);
        if (defined('CURL_HTTP_VERSION_2_0')) {
            curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_2_0);
        }
        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $ct = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $finalUrl = (string) curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
        $err = curl_error($ch);
        curl_close($ch);

        if ($body === false || $code < 200 || $code >= 400) {
            if ($code === 403 || $code === 429) {
                return [
                    'ok' => false,
                    'httpCode' => $code,
                    'error' => "O site de destino bloqueou a captura automatizada (HTTP {$code} — proteção WAF / Cloudflare / anti-bot)."
                ];
            }
            return ['ok' => false, 'httpCode' => $code, 'error' => $err ?: ("HTTP " . $code)];
        }
        if (strlen($body) > $maxBytes) {
            return ['ok' => false, 'error' => 'Arquivo excede limite permitido'];
        }
        return ['ok' => true, 'body' => $body, 'contentType' => $ct, 'finalUrl' => $finalUrl ?: $url];
    }

    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => $timeout,
            'header' => "User-Agent: $ua\r\nAccept: */*\r\n"
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ]);
    $body = @file_get_contents($url, false, $ctx);
    if ($body === false) {
        return ['ok' => false, 'error' => 'Falha ao baixar URL'];
    }
    return ['ok' => true, 'body' => $body, 'contentType' => '', 'finalUrl' => $url];
}

function resolveAbsoluteUrl($ref, $baseUrl) {
    $trimmed = trim(trim((string) $ref), "\"'");
    if ($trimmed === '' || preg_match('/^(data:|javascript:|mailto:|tel:|#|about:|blob:)/i', $trimmed)) {
        return null;
    }
    if (preg_match('/^https?:\/\//i', $trimmed)) {
        return $trimmed;
    }
    $base = @parse_url($baseUrl);
    if (!$base || empty($base['scheme']) || empty($base['host'])) {
        return null;
    }
    $scheme = $base['scheme'];
    $host = $base['host'];
    $port = isset($base['port']) ? ':' . $base['port'] : '';

    if (strpos($trimmed, '//') === 0) {
        return $scheme . ':' . $trimmed;
    }
    if ($trimmed[0] === '/') {
        return $scheme . '://' . $host . $port . $trimmed;
    }
    $basePath = isset($base['path']) ? $base['path'] : '/';
    $dir = preg_replace('/\/[^\/]*$/', '/', $basePath);
    $combined = $dir . $trimmed;

    // Normaliza ../ e ./
    $parts = explode('/', $combined);
    $stack = [];
    foreach ($parts as $p) {
        if ($p === '' || $p === '.') continue;
        if ($p === '..') {
            array_pop($stack);
        } else {
            $stack[] = $p;
        }
    }
    return $scheme . '://' . $host . $port . '/' . implode('/', $stack);
}

function sanitizeAssetFilename($rawUrl, $contentType = '', $fallbackExt = '.bin') {
    $hash = substr(md5($rawUrl), 0, 10);
    $pathStr = (string) (@parse_url($rawUrl, PHP_URL_PATH) ?: '');
    $seg = basename($pathStr);
    $info = pathinfo($seg);
    $base = preg_replace('/[^a-zA-Z0-9_-]/', '_', $info['filename'] ?? 'resource');
    $base = substr($base ?: 'resource', 0, 32);
    $ext = isset($info['extension']) ? '.' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $info['extension'])) : '';

    if (strlen($ext) < 2 || strlen($ext) > 7) {
        $ctMap = [
            'text/css' => '.css',
            'application/javascript' => '.js',
            'text/javascript' => '.js',
            'image/png' => '.png',
            'image/jpeg' => '.jpg',
            'image/webp' => '.webp',
            'image/gif' => '.gif',
            'image/svg+xml' => '.svg',
            'image/x-icon' => '.ico',
            'font/woff2' => '.woff2',
            'font/woff' => '.woff',
            'font/ttf' => '.ttf'
        ];
        $cleanCt = strtolower(trim(explode(';', (string) $contentType)[0]));
        $ext = $ctMap[$cleanCt] ?? $fallbackExt;
    }
    return $base . '_' . $hash . $ext;
}

/* ============================================================================
   CAPTURA OFFLINE: POST api.php?action=capture
   ============================================================================ */
if ($action === 'capture') {
    if (!class_exists('ZipArchive')) {
        jsonResponse(['error' => 'A extensão PHP ZipArchive não está habilitada neste servidor cPanel. Ative "zip" em Select PHP Version.'], 500);
    }

    $rawBody = file_get_contents('php://input');
    $payload = @json_decode($rawBody, true);
    if (!is_array($payload)) $payload = $_POST;

    $rawUrl = trim((string) ($payload['url'] ?? ''));
    if ($rawUrl === '') {
        jsonResponse(['error' => 'Informe uma URL válida para captura.'], 400);
    }
    if (!preg_match('/^https?:\/\//i', $rawUrl)) {
        $rawUrl = 'https://' . $rawUrl;
    }

    $parsed = @parse_url($rawUrl);
    if (!$parsed || empty($parsed['host']) || !in_array(strtolower($parsed['scheme'] ?? ''), ['http', 'https'], true)) {
        jsonResponse(['error' => 'URL inválida. Ex.: https://exemplo.com'], 400);
    }
    if (isPrivateOrReservedHost($parsed['host'])) {
        jsonResponse(['error' => 'Endereços locais ou redes privadas não são permitidos por segurança.'], 403);
    }

    $mode = in_array($payload['mode'] ?? '', ['standard', 'complete', 'fast'], true) ? $payload['mode'] : 'standard';
    $opts = is_array($payload['options'] ?? null) ? $payload['options'] : [];
    $includeImages = ($opts['includeImages'] ?? true) !== false;
    $includeFonts = ($opts['includeFonts'] ?? true) !== false;
    $includeScripts = $mode === 'fast' ? false : (($opts['includeScripts'] ?? true) !== false);
    $includeReadme = ($opts['includeReadme'] ?? true) !== false;
    $maxAssets = $mode === 'fast' ? 30 : 90;

    $startTime = microtime(true);
    $logs = [];
    $logs[] = "GET $rawUrl";

    $page = fetchUrlBinary($rawUrl, 20, 8388608, true);
    if (!$page['ok']) {
        jsonResponse(['error' => 'Não foi possível acessar o site: ' . $page['error']], 502);
    }

    $baseUrl = $page['finalUrl'];
    $html = $page['body'];
    $host = (string) (@parse_url($baseUrl, PHP_URL_HOST) ?: $parsed['host']);
    $slug = preg_replace('/[^a-zA-Z0-9.-]/', '_', preg_replace('/^www\./', '', $host));
    $logs[] = sprintf('HTML obtido (%.1f KB) · Origem: %s', strlen($html) / 1024, $baseUrl);

    $assetQueue = [];
    $registerAsset = function ($rawRef, $kind, $fallbackExt) use (&$assetQueue, $baseUrl, $maxAssets) {
        $abs = resolveAbsoluteUrl($rawRef, $baseUrl);
        if (!$abs) return;
        $h = @parse_url($abs, PHP_URL_HOST);
        if (!$h || isPrivateOrReservedHost($h)) return;
        if (!isset($assetQueue[$abs])) {
            if (count($assetQueue) >= $maxAssets) return;
            $assetQueue[$abs] = ['url' => $abs, 'kind' => $kind, 'fallbackExt' => $fallbackExt, 'rawRefs' => []];
        }
        $assetQueue[$abs]['rawRefs'][$rawRef] = true;
    };

    // 1. Stylesheets & icons
    if (preg_match_all('/<link\b[^>]*>/i', $html, $links)) {
        foreach ($links[0] as $tag) {
            if (!preg_match('/\bhref\s*=\s*["\']([^"\']+)["\']/i', $tag, $hm)) continue;
            $rel = preg_match('/\brel\s*=\s*["\']([^"\']+)["\']/i', $tag, $rm) ? strtolower($rm[1]) : '';
            if (strpos($rel, 'stylesheet') !== false) {
                $registerAsset($hm[1], 'css', '.css');
            } elseif ($includeImages && (strpos($rel, 'icon') !== false)) {
                $registerAsset($hm[1], 'image', '.ico');
            }
        }
    }

    // 2. Scripts
    if ($includeScripts && preg_match_all('/<script\b[^>]*\bsrc\s*=\s*["\']([^"\']+)["\'][^>]*>/i', $html, $scripts)) {
        foreach ($scripts[1] as $src) {
            $registerAsset($src, 'js', '.js');
        }
    }

    // 3. Imagens, lazy-load e inline url()
    if ($includeImages) {
        if (preg_match_all('/\b(?:src|data-src|data-lazy-src|poster)\s*=\s*["\']([^"\']+)["\']/i', $html, $imgs)) {
            foreach ($imgs[1] as $val) {
                if (preg_match('/\.(js|mjs)(\?|$)/i', $val) && !$includeScripts) continue;
                if (preg_match('/\.(png|jpe?g|webp|gif|svg|avif|ico|bmp)(\?|$)/i', $val) || preg_match('/images|img|photo|media|storage/i', $val)) {
                    $registerAsset($val, 'image', '.png');
                }
            }
        }
        if (preg_match_all('/\bsrcset\s*=\s*["\']([^"\']+)["\']/i', $html, $srcsets)) {
            foreach ($srcsets[1] as $ss) {
                foreach (explode(',', $ss) as $part) {
                    $cand = preg_split('/\s+/', trim($part))[0] ?? '';
                    if ($cand !== '') $registerAsset($cand, 'image', '.webp');
                }
            }
        }
        if (preg_match_all('/url\(\s*([\'"]?)([^\)\'"]+)\1\s*\)/i', $html, $urls)) {
            foreach ($urls[2] as $u) {
                $registerAsset($u, 'image', '.webp');
            }
        }
    }

    $logs[] = 'Recursos mapeados: ' . count($assetQueue);

    $downloaded = [];
    $cssSubAssets = [];
    $stats = ['css' => 0, 'js' => 0, 'images' => 0, 'fonts' => 0, 'failed' => 0];

    foreach ($assetQueue as $absUrl => $item) {
        $res = fetchUrlBinary($absUrl, 10, 6291456);
        if (!$res['ok']) {
            $stats['failed']++;
            continue;
        }
        $fname = sanitizeAssetFilename($absUrl, $res['contentType'], $item['fallbackExt']);
        $downloaded[$absUrl] = [
            'localPath' => 'assets/' . $fname,
            'body' => $res['body'],
            'kind' => $item['kind'],
            'finalUrl' => $res['finalUrl']
        ];

        if ($item['kind'] === 'css') {
            $stats['css']++;
            if (preg_match_all('/url\(\s*([\'"]?)([^\)\'"]+)\1\s*\)/i', $res['body'], $cm)) {
                foreach ($cm[2] as $subRef) {
                    $subAbs = resolveAbsoluteUrl($subRef, $res['finalUrl'] ?: $absUrl);
                    if (!$subAbs || isset($downloaded[$subAbs]) || isset($cssSubAssets[$subAbs])) continue;
                    $isFont = (bool) preg_match('/\.(woff2?|ttf|otf|eot)(\?|$)/i', $subAbs);
                    if ($isFont && !$includeFonts) continue;
                    if (!$isFont && !$includeImages) continue;
                    if (count($cssSubAssets) < 40) {
                        $cssSubAssets[$subAbs] = ['url' => $subAbs, 'kind' => $isFont ? 'font' : 'image', 'fallbackExt' => $isFont ? '.woff2' : '.png'];
                    }
                }
            }
        } elseif ($item['kind'] === 'js') {
            $stats['js']++;
        } else {
            $stats['images']++;
        }
    }

    // Baixa sub-recursos de CSS (fontes @font-face e imagens)
    foreach ($cssSubAssets as $subAbs => $sub) {
        $res = fetchUrlBinary($subAbs, 10, 4194304);
        if (!$res['ok']) {
            $stats['failed']++;
            continue;
        }
        $fname = sanitizeAssetFilename($subAbs, $res['contentType'], $sub['fallbackExt']);
        $downloaded[$subAbs] = [
            'localPath' => 'assets/' . $fname,
            'body' => $res['body'],
            'kind' => $sub['kind'],
            'finalUrl' => $res['finalUrl']
        ];
        if ($sub['kind'] === 'font') $stats['fonts']++;
        else $stats['images']++;
    }

    $logs[] = sprintf('Baixados: %d CSS, %d JS, %d Imagens, %d Fontes', $stats['css'], $stats['js'], $stats['images'], $stats['fonts']);

    // Cria o arquivo ZIP
    $tempDir = getTempStorageDir();
    cleanupOldZips($tempDir);

    $jobId = bin2hex(random_bytes(8));
    $zipPath = $tempDir . DIRECTORY_SEPARATOR . $jobId . '.zip';
    $filename = 'mpdownloader_' . $slug . '_' . substr((string) time(), -6) . '.zip';

    $zip = new ZipArchive();
    if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        jsonResponse(['error' => 'Não foi possível criar o arquivo ZIP temporário no servidor.'], 500);
    }

    $totalFiles = 0;

    // Reescreve URLs dentro dos CSS e adiciona assets ao ZIP
    foreach ($downloaded as $absUrl => $f) {
        $body = $f['body'];
        if ($f['kind'] === 'css') {
            $body = preg_replace_callback('/url\(\s*([\'"]?)([^\)\'"]+)\1\s*\)/i', function ($m) use ($downloaded, $f, $absUrl) {
                $subAbs = resolveAbsoluteUrl($m[2], $f['finalUrl'] ?: $absUrl);
                if ($subAbs && isset($downloaded[$subAbs])) {
                    $rel = preg_replace('/^assets\//', '', $downloaded[$subAbs]['localPath']);
                    return 'url("' . $rel . '")';
                }
                return $m[0];
            }, $body);
        }
        $zip->addFromString($f['localPath'], $body);
        $totalFiles++;
    }

    // Reescreve links no HTML principal
    foreach ($assetQueue as $absUrl => $item) {
        if (!isset($downloaded[$absUrl])) continue;
        $localPath = $downloaded[$absUrl]['localPath'];
        foreach (array_keys($item['rawRefs']) as $rawRef) {
            if ($rawRef !== '') {
                $html = str_replace($rawRef, $localPath, $html);
            }
        }
    }
    $html = preg_replace('/\bdata-src\s*=\s*(["\']assets\/[^"\']+["\'])/i', 'src=$1 data-orig-lazy=$1', $html);
    $banner = "<!-- Capturado offline com Mpdownloader (PHP cPanel · MPDs v1.0) · Origem: {$baseUrl} -->\n";
    $zip->addFromString('index.html', $banner . $html);
    $totalFiles++;

    if ($includeReadme) {
        $readme = implode("\n", [
            '==============================================================',
            '  Mpdownloader — Pacote Offline Gerado com Sucesso (cPanel)',
            '==============================================================',
            "Origem:   $baseUrl",
            "Modo:     $mode",
            'Data:     ' . date('d/m/Y H:i:s'),
            sprintf('Recursos: %d CSS | %d JS | %d Imagens | %d Fontes', $stats['css'], $stats['js'], $stats['images'], $stats['fonts']),
            '',
            'COMO VISUALIZAR OFFLINE:',
            '1. Duplo clique: extraia o ZIP e abra "index.html" no navegador.',
            '2. Servidor local: abra o terminal na pasta extraida e rode:',
            '   npx serve .   ou   python -m http.server 8080',
            '=============================================================='
        ]);
        $zip->addFromString('README-OFFLINE.txt', $readme);
        $totalFiles++;
    }

    $zip->close();

    @file_put_contents($zipPath . '.meta', json_encode(['filename' => $filename, 'url' => $baseUrl]));
    $sizeBytes = (int) @filesize($zipPath);
    $elapsedSec = round(microtime(true) - $startTime, 1);
    $logs[] = sprintf('Pacote ZIP concluído em %.1fs (%d arquivos)', $elapsedSec, $totalFiles);

    jsonResponse([
        'ok' => true,
        'jobId' => $jobId,
        'downloadUrl' => 'api.php?action=download&id=' . $jobId,
        'url' => $baseUrl,
        'hostname' => $host,
        'filename' => $filename,
        'mode' => $mode,
        'totalFiles' => $totalFiles,
        'sizeBytes' => $sizeBytes,
        'elapsedSec' => $elapsedSec,
        'stats' => $stats,
        'logs' => $logs
    ]);
}

jsonResponse(['error' => 'Ação inválida'], 400);
