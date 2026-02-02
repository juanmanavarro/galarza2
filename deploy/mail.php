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
  echo json_encode([
    'ok' => false,
    'error' => 'Campos obligatorios: name, location, email',
  ]);
  exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(422);
  echo json_encode([
    'ok' => false,
    'error' => 'Email inválido',
  ]);
  exit;
}

$to = getenv('MAIL_TO') ?: 'hola@juanmanavar.ro';
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
$headers[] = 'From: no-reply@galarza.local';
$headers[] = 'Reply-To: ' . $email;
$headers[] = 'Content-Type: text/plain; charset=UTF-8';

$sent = mail($to, $subject, $message, implode("\r\n", $headers));

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
$userHeaders[] = 'From: no-reply@galarza.local';
$userHeaders[] = 'Content-Type: text/plain; charset=UTF-8';

$sentUser = mail($email, $userSubject, $userMessage, implode("\r\n", $userHeaders));

if (!$sent || !$sentUser) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'No se pudo enviar el email']);
  exit;
}

echo json_encode(['ok' => true]);
