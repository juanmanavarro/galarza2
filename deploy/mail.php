<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
  exit;
}

function loadEnv($path) {
  if (!is_file($path)) {
    return;
  }

  $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  foreach ($lines as $line) {
    $line = trim($line);
    if ($line === '' || substr($line, 0, 1) === '#') {
      continue;
    }
    $sep = strpos($line, '=');
    if ($sep === false) {
      continue;
    }
    $key = trim(substr($line, 0, $sep));
    $value = trim(substr($line, $sep + 1));
    if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') ||
        (substr($value, 0, 1) === "'" && substr($value, -1) === "'")) {
      $value = substr($value, 1, -1);
    }
    putenv("$key=$value");
    $_ENV[$key] = $value;
  }
}

loadEnv(__DIR__ . '/.env');

$smtpFrom = getenv('MAIL_FROM') ?: 'configurador@industriasgalarza.com';
$to = getenv('MAIL_TO') ?: 'configurador@industriasgalarza.com';

$raw = file_get_contents('php://input');
$data = [];

if (!empty($raw)) {
  $decoded = json_decode($raw, true);
  if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
    $data = $decoded;
  }
}

if (empty($data)) {
  $data = $_POST ?? [];
}

$name = trim($data['name'] ?? '');
$location = trim($data['location'] ?? '');
$email = trim($data['email'] ?? '');

if ($name === '' || $location === '' || $email === '') {
  http_response_code(422);
  echo json_encode(['ok' => false, 'error' => 'Campos obligatorios: name, location, email']);
  exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(422);
  echo json_encode(['ok' => false, 'error' => 'Email inválido']);
  exit;
}

$result = $data['result'] ?? null;
$totalPowerWatts = is_array($result) ? (float) ($result['totalPowerWatts'] ?? 0) : 0;
$totalPowerAmps = is_array($result) ? (float) ($result['totalPowerAmps'] ?? 0) : 0;

if (!is_array($result) || ($totalPowerWatts <= 0 && $totalPowerAmps <= 0)) {
  http_response_code(422);
  echo json_encode(['ok' => false, 'error' => 'No hay resultados calculados para enviar']);
  exit;
}

function sendViaMail($to, $subject, $message, $headersArray) {
  $headersStr = implode("\r\n", $headersArray);
  return mail($to, $subject, $message, $headersStr);
}

function smtpReadLine($socket) {
  $line = fgets($socket, 515);
  if ($line === false) {
    throw new Exception('SMTP connection lost');
  }
  return $line;
}

function smtpExpect($socket, $expected) {
  $line = smtpReadLine($socket);
  if (substr($line, 0, 3) !== $expected) {
    throw new Exception("SMTP expected $expected, got: " . trim($line));
  }
  return $line;
}

function smtpReadAll($socket) {
  do {
    $line = smtpReadLine($socket);
    if (substr($line, 3, 1) !== '-') {
      return $line;
    }
  } while (true);
}

function sendViaSmtp($to, $subject, $body, $headers) {
  $smtpHost = getenv('SMTP_HOST') ?: 'smtp.office365.com';
  $smtpPort = getenv('SMTP_PORT') ?: '587';
  $smtpUser = getenv('SMTP_USER') ?: 'configurador@industriasgalarza.com';
  $smtpPass = getenv('SMTP_PASS') ?: '';
  $smtpFrom = getenv('MAIL_FROM') ?: 'configurador@industriasgalarza.com';
  $smtpSecure = getenv('SMTP_SECURE') ?: 'tls';

  if ($smtpPass === '') {
    throw new Exception('SMTP_PASS not configured');
  }

  $prefix = $smtpSecure === 'ssl' ? 'ssl://' : '';

  $errno = 0;
  $errstr = '';
  $socket = @stream_socket_client(
    $prefix . $smtpHost . ':' . $smtpPort,
    $errno,
    $errstr,
    15
  );

  if (!$socket) {
    throw new Exception("Connection failed: $errstr ($errno)");
  }

  smtpExpect($socket, '220');

  fwrite($socket, "EHLO galarza.local\r\n");
  smtpReadAll($socket);

  if ($smtpSecure === 'tls') {
    fwrite($socket, "STARTTLS\r\n");
    smtpExpect($socket, '220');
    $crypto = stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT);
    if (!$crypto) {
      throw new Exception('STARTTLS negotiation failed');
    }
    fwrite($socket, "EHLO galarza.local\r\n");
    smtpReadAll($socket);
  }

  fwrite($socket, "AUTH LOGIN\r\n");
  smtpExpect($socket, '334');

  fwrite($socket, base64_encode($smtpUser) . "\r\n");
  smtpExpect($socket, '334');

  fwrite($socket, base64_encode($smtpPass) . "\r\n");
  smtpExpect($socket, '235');

  fwrite($socket, "MAIL FROM:<$smtpFrom>\r\n");
  smtpExpect($socket, '250');

  fwrite($socket, "RCPT TO:<$to>\r\n");
  smtpExpect($socket, '250');

  fwrite($socket, "DATA\r\n");
  smtpExpect($socket, '354');

  fwrite($socket, "Subject: $subject\r\n");
  foreach ($headers as $h) {
    fwrite($socket, str_replace(["\r\n", "\r", "\n"], "\r\n", $h) . "\r\n");
  }
  fwrite($socket, "MIME-Version: 1.0\r\n");
  fwrite($socket, "\r\n");

  $body = str_replace(["\r\n", "\r", "\n"], "\r\n", $body);
  $body = preg_replace('/^\./m', '..', $body);
  fwrite($socket, $body . "\r\n");

  fwrite($socket, ".\r\n");
  smtpExpect($socket, '250');

  fwrite($socket, "QUIT\r\n");
  fclose($socket);
}

// --- Internal email ---
$subject = 'Nuevo envío de formulario';

$lines = [
  "Nombre: {$name}",
  "Provincia / País: {$location}",
  "Email: {$email}",
];

foreach ($data as $key => $value) {
  if (in_array($key, ['name', 'location', 'email'], true)) {
    continue;
  }
  if (is_array($value)) {
    $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  }
  $lines[] = sprintf('%s: %s', $key, (string) $value);
}

$message = implode("\n", $lines);

$headers = [];
$headers[] = 'From: ' . $smtpFrom;
$headers[] = 'Reply-To: ' . $email;
$headers[] = 'Content-Type: text/plain; charset=UTF-8';

$smtpSent = false;
$smtpError = '';

if (getenv('SMTP_PASS')) {
  try {
    sendViaSmtp($to, $subject, $message, $headers);
    $smtpSent = true;
  } catch (Exception $e) {
    $smtpError = $e->getMessage();
  }
}

if (!$smtpSent) {
  $sent = sendViaMail($to, $subject, $message, $headers);
  if (!$sent) {
    http_response_code(500);
    $detail = $smtpError ? "SMTP: $smtpError / mail(): failed" : 'mail() function returned false';
    echo json_encode(['ok' => false, 'error' => 'Error al enviar email: ' . $detail]);
    exit;
  }
}

// --- User confirmation ---
$userSubject = 'Hemos recibido tu configuración';
$userMessageLines = [
  "Hola {$name},",
  "",
  "Hemos recibido tu configuración. Pronto nos pondremos en contacto contigo.",
  "Gracias.",
  "",
  "Resumen:",
  "Nombre: {$name}",
  "Provincia / País: {$location}",
  "Email: {$email}",
  "",
  "Configuración:",
  json_encode($data['config'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
];
$userMessage = implode("\n", $userMessageLines);

$userHeaders = [];
$userHeaders[] = 'From: ' . $smtpFrom;
$userHeaders[] = 'Content-Type: text/plain; charset=UTF-8';

$smtpSent = false;
$smtpError = '';

if (getenv('SMTP_PASS')) {
  try {
    sendViaSmtp($email, $userSubject, $userMessage, $userHeaders);
    $smtpSent = true;
  } catch (Exception $e) {
    $smtpError = $e->getMessage();
  }
}

if (!$smtpSent) {
  $sent = sendViaMail($email, $userSubject, $userMessage, $userHeaders);
  if (!$sent) {
    http_response_code(500);
    $detail = $smtpError ? "SMTP: $smtpError / mail(): failed" : 'mail() function returned false';
    echo json_encode(['ok' => false, 'error' => 'Error al enviar confirmación: ' . $detail]);
    exit;
  }
}

echo json_encode(['ok' => true]);
