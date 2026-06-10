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

// --- Helper functions for message formatting ---

function formatYesNo($value) {
    if ($value === '0' || $value === 0 || $value === false || $value === null) return 'No';
    return 'Sí';
}

function formatConfigSection($config) {
    $lines = [];
    if (!is_array($config) || empty($config)) return $lines;

    $labels = [
        'application_industry_type' => 'Tipo de aplicación / industria',
        'number_and_type_of_machines_to_feed' => 'Número de máquinas a alimentar',
        'type_of_conductors_to_use' => 'Tipo de conductores a usar',
        'fase' => 'Fases',
        'ground' => 'Tierra',
        'neutral' => 'Neutro',
        'total_distance' => 'Recorrido total',
        'type_of_line' => 'Tipo de recorrido',
        'work_environment' => 'Ambiente de trabajo',
        'has_mixed_indoor_outdoor_sections' => 'Hay tramos interiores y exteriores mezclados',
        'feeding_point_position' => 'Posición del punto de alimentación',
        'has_dust' => 'Hay polvo',
        'has_corrosive_elements' => 'Hay elementos corrosivos',
        'protected_line' => 'Línea protegida con goma de cierre',
        'min_temperature' => 'Temperatura mínima',
        'max_temperature' => 'Temperatura máxima',
        'voltage' => 'Voltaje',
        'hertz' => 'Frecuencia',
        'max_permissible_voltage_drop' => 'Máxima caída de tensión permitida',
        'power_mode' => 'Máxima potencia',
        'max_simultaneous_power_cv' => 'Potencia simultánea en caballos',
        'max_simultaneous_power_kw' => 'Potencia simultánea en kilovatios',
        'max_simultaneous_power_amp' => 'Intensidad nominal simultánea',
        'intensity_to_install_amp' => 'Intensidad a instalar',
        'supply_support_arms' => 'Brazos de soporte de alimentación',
        'has_sectioned_zones' => 'Hay zonas seccionadas',
        'sketch_file' => 'Archivo de croquis',
        'info' => 'Información adicional',
    ];

    $units = [
        'total_distance' => ' m',
        'min_temperature' => ' °C',
        'max_temperature' => ' °C',
        'voltage' => ' V',
        'hertz' => ' Hz',
        'max_permissible_voltage_drop' => ' %',
    ];

    $yesNoKeys = [
        'has_mixed_indoor_outdoor_sections' => true,
        'has_dust' => true,
        'has_corrosive_elements' => true,
        'protected_line' => true,
        'supply_support_arms' => true,
        'has_sectioned_zones' => true,
    ];

    $orderedKeys = [
        'application_industry_type',
        'number_and_type_of_machines_to_feed',
        'type_of_conductors_to_use',
        'fase', 'ground', 'neutral',
        'total_distance',
        'type_of_line',
        'work_environment',
        'has_mixed_indoor_outdoor_sections',
        'feeding_point_position',
        'has_dust',
        'has_corrosive_elements',
        'protected_line',
        'min_temperature', 'max_temperature',
        'voltage', 'hertz',
        'max_permissible_voltage_drop',
        'power_mode',
        'max_simultaneous_power_cv', 'max_simultaneous_power_kw', 'max_simultaneous_power_amp',
        'intensity_to_install_amp',
        'supply_support_arms',
        'has_sectioned_zones',
        'sketch_file',
        'info',
    ];

    foreach ($orderedKeys as $key) {
        if (!array_key_exists($key, $config)) continue;
        $value = $config[$key];
        if ($value === null || $value === '' || (is_array($value) && empty($value))) continue;

        $label = $labels[$key] ?? $key;

        if (isset($yesNoKeys[$key])) {
            $formatted = formatYesNo($value);
        } elseif ($key === 'power_mode') {
            $formatted = ($value === 'simultanea') ? 'Simultánea' : 'Por grúa';
        } elseif ($key === 'feeding_point_position') {
            $distance = $config['feeding_point_position_distance'] ?? null;
            if ($value === 'extreme') $formatted = 'Extremo';
            elseif ($value === 'central') $formatted = 'Central';
            elseif ($value === 'distance') $formatted = 'A ' . ($distance ?: '?') . ' m del extremo';
            else $formatted = $value;
        } else {
            $unit = $units[$key] ?? '';
            $formatted = $value . $unit;
        }

        $lines[] = "{$label}: {$formatted}";
    }

    return $lines;
}

function formatTramosSection($config) {
    $lines = [];
    $tramos = $config['tramos'] ?? [];
    if (!is_array($tramos) || empty($tramos)) return $lines;

    $hasTramos = false;
    foreach ($tramos as $tramo) {
        if (($tramo['tramo_recto'] ?? null) !== null ||
            ($tramo['radio'] ?? null) !== null ||
            ($tramo['angulo'] ?? null) !== null ||
            ($tramo['longitud'] ?? null) !== null) {
            $hasTramos = true;
            break;
        }
    }
    if (!$hasTramos) return $lines;

    $lines[] = '';
    $lines[] = 'Tramos:';
    foreach ($tramos as $i => $tramo) {
        $num = $i + 1;
        if (($tramo['tramo_recto'] ?? null) !== null) $lines[] = "  Tramo {$num} - Tramo recto: {$tramo['tramo_recto']} m";
        if (($tramo['radio'] ?? null) !== null) $lines[] = "  Tramo {$num} - Radio: {$tramo['radio']} m";
        if (($tramo['angulo'] ?? null) !== null) $lines[] = "  Tramo {$num} - Ángulo: {$tramo['angulo']}°";
        if (($tramo['longitud'] ?? null) !== null) $lines[] = "  Tramo {$num} - Longitud de la curva: {$tramo['longitud']} m";
    }
    return $lines;
}

function formatGruasSection($gruas) {
    $lines = [];
    if (!is_array($gruas) || empty($gruas)) return $lines;

    foreach ($gruas as $i => $grua) {
        if (!isset($grua['servicios']) || !is_array($grua['servicios'])) continue;
        $num = $i + 1;
        $lines[] = '';
        $lines[] = "Grúa {$num}";
        foreach ($grua['servicios'] as $nombre => $datos) {
            $parts = [];
            if (($datos['cv'] ?? null) !== null) $parts[] = "CV: {$datos['cv']}";
            if (($datos['kw'] ?? null) !== null) $parts[] = "Kw: {$datos['kw']}";
            if (($datos['amp'] ?? null) !== null) $parts[] = "Amp: {$datos['amp']}";
            if (($datos['ed'] ?? null) !== null) $parts[] = "%ED: {$datos['ed']}";
            if (!empty($parts)) {
                $lines[] = "  {$nombre} - " . implode(', ', $parts);
            }
        }
        if (!empty($grua['tomacorrientes']) && $grua['tomacorrientes'] !== 'sin ítem') {
            $lines[] = "  Tomacorrientes: {$grua['tomacorrientes']}";
        }
        if (!empty($grua['brazo_arrastre']) && $grua['brazo_arrastre'] !== 'sin ítem') {
            $lines[] = "  Brazo arrastre: {$grua['brazo_arrastre']}";
        }
    }
    return $lines;
}

function formatResultSection($result) {
    $lines = [];
    if (!is_array($result) || empty($result)) return $lines;

    $labels = [
        'totalPowerWatts' => 'Potencia simultánea total',
        'totalPowerAmps' => 'Intensidad total calculada',
        'intensityToInstallAmp' => 'Intensidad a instalar',
        'lmModelRef' => 'Modelo LM seleccionado',
        'voltageDropVolts' => 'Caída de tensión',
        'voltageDropPercent' => 'Caída de tensión',
        'voltageDropMessage' => 'Mensaje de caída de tensión',
    ];

    $units = [
        'totalPowerWatts' => ' W',
        'totalPowerAmps' => ' A',
        'intensityToInstallAmp' => ' A',
        'voltageDropVolts' => ' V',
        'voltageDropPercent' => ' %',
    ];

    $orderedKeys = [
        'lmModelRef',
        'totalPowerWatts',
        'totalPowerAmps',
        'intensityToInstallAmp',
        'voltageDropVolts',
        'voltageDropPercent',
        'voltageDropMessage',
    ];

    foreach ($orderedKeys as $key) {
        if (!array_key_exists($key, $result)) continue;
        $value = $result[$key];
        if ($value === null || $value === '') continue;
        $label = $labels[$key] ?? $key;
        $unit = $units[$key] ?? '';
        $lines[] = "{$label}: {$value}{$unit}";
    }

    // Option 1: Incrementar intensidad de la línea
    if (!empty($result['lineIncreaseOption']) && is_array($result['lineIncreaseOption'])) {
        $lines[] = '';
        $lines[] = 'Opción 1. Incrementar intensidad de la línea:';
        foreach (formatOptionLines($result['lineIncreaseOption']) as $l) {
            $lines[] = "  {$l}";
        }
    }

    // Option 2: Alimentación intermedia
    if (!empty($result['intermediateFeedingOption']) && is_array($result['intermediateFeedingOption'])) {
        $lines[] = '';
        $lines[] = 'Opción 2. Alimentación intermedia:';
        foreach (formatOptionLines($result['intermediateFeedingOption']) as $l) {
            $lines[] = "  {$l}";
        }
    }

    return $lines;
}

function formatOptionLines($option) {
    $lines = [];
    $labels = [
        'recommendedFeedingType' => 'Tipo de alimentación recomendado',
        'selectedLengthMeters' => 'Longitud seleccionada',
        'intensityToInstallAmp' => 'Intensidad a instalar',
        'lmModelRef' => 'Modelo LM seleccionado',
        'voltageDropVolts' => 'Caída de tensión',
        'voltageDropPercent' => 'Caída de tensión',
        'voltageDropPercentDisplay' => 'Caída de tensión',
        'voltageDropMessage' => 'Mensaje',
    ];
    $units = [
        'selectedLengthMeters' => ' m',
        'intensityToInstallAmp' => ' A',
        'voltageDropVolts' => ' V',
        'voltageDropPercent' => ' %',
        'voltageDropPercentDisplay' => ' %',
    ];

    foreach ($labels as $key => $label) {
        if (!array_key_exists($key, $option)) continue;
        $value = $option[$key];
        if ($value === null || $value === '') continue;
        $unit = $units[$key] ?? '';
        $lines[] = "{$label}: {$value}{$unit}";
    }
    return $lines;
}

function formatMaterialsSection($materials) {
    $lines = [];
    if (!is_array($materials) || empty($materials)) {
        $lines[] = 'No hay materiales.';
        return $lines;
    }

    foreach ($materials as $i => $mat) {
        $num = $i + 1;
        $lines[] = '';
        $lines[] = "{$num}. {$mat['description']}";
        if (!empty($mat['section'])) $lines[] = "   Sección: {$mat['section']}";
        if (!empty($mat['reference'])) $lines[] = "   Referencia: {$mat['reference']}";
        if (isset($mat['quantity']) && $mat['quantity'] !== '' && $mat['quantity'] !== null) $lines[] = "   Cantidad: {$mat['quantity']}";
        if (!empty($mat['unit'])) $lines[] = "   Unidad: {$mat['unit']}";
    }
    return $lines;
}

// --- Build internal email ---
$subject = 'Nuevo envío de formulario';

$config = $data['config'] ?? [];
$result = $data['result'] ?? [];
$materials = $data['materials'] ?? [];

$messageLines = [];

// Contact
$messageLines[] = 'DATOS DE CONTACTO';
$messageLines[] = "Nombre: {$name}";
$messageLines[] = "Provincia / País: {$location}";
$messageLines[] = "Email: {$email}";

// Config
$configLines = formatConfigSection($config);
if (!empty($configLines)) {
    $messageLines[] = '';
    $messageLines[] = 'DATOS INTRODUCIDOS';
    $messageLines = array_merge($messageLines, $configLines);
}

// Tramos
$tramosLines = formatTramosSection($config);
if (!empty($tramosLines)) {
    $messageLines = array_merge($messageLines, $tramosLines);
}

// Grúas
$gruas = $config['gruas'] ?? [];
$gruaLines = formatGruasSection($gruas);
if (!empty($gruaLines)) {
    $messageLines[] = '';
    $messageLines[] = 'GRÚAS';
    $messageLines = array_merge($messageLines, $gruaLines);
}

// Result
$resultLines = formatResultSection($result);
if (!empty($resultLines)) {
    $messageLines[] = '';
    $messageLines[] = 'RESULTADOS CALCULADOS';
    $messageLines = array_merge($messageLines, $resultLines);
}

// Materials
$materialsLines = formatMaterialsSection($materials);
$messageLines[] = '';
$messageLines[] = 'MATERIALES';
$messageLines = array_merge($messageLines, $materialsLines);

$message = implode("\n", $messageLines);

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
    "DATOS DE CONTACTO",
    "Nombre: {$name}",
    "Provincia / País: {$location}",
    "Email: {$email}",
];

$configLines = formatConfigSection($config);
if (!empty($configLines)) {
    $userMessageLines[] = '';
    $userMessageLines[] = 'DATOS INTRODUCIDOS';
    $userMessageLines = array_merge($userMessageLines, $configLines);
}

$tramosLines = formatTramosSection($config);
if (!empty($tramosLines)) {
    $userMessageLines = array_merge($userMessageLines, $tramosLines);
}

$gruaLines = formatGruasSection($gruas);
if (!empty($gruaLines)) {
    $userMessageLines[] = '';
    $userMessageLines[] = 'GRÚAS';
    $userMessageLines = array_merge($userMessageLines, $gruaLines);
}

$resultLines = formatResultSection($result);
if (!empty($resultLines)) {
    $userMessageLines[] = '';
    $userMessageLines[] = 'RESULTADOS CALCULADOS';
    $userMessageLines = array_merge($userMessageLines, $resultLines);
}

$materialsLines = formatMaterialsSection($materials);
$userMessageLines[] = '';
$userMessageLines[] = 'MATERIALES';
$userMessageLines = array_merge($userMessageLines, $materialsLines);

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
