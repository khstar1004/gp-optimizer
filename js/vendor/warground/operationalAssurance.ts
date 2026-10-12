// @ts-nocheck
const REQUIREMENT_CATALOG = {
  source_extraction_accuracy: {
    label: '원천자료 추출 정확도',
    request: '작전계획·상황자료 원문과 시스템 추출 결과를 대조하고 오류율을 확인하세요.',
    artifact: '원문 대조 보고서 또는 자동 검증 로그',
  },
  adversary_red_team_validation: {
    label: '대항군 레드팀 검증',
    request: '대항군 가정, 위협 행동, 반응 결과를 레드팀이 검토하고 판정하세요.',
    artifact: '레드팀 검증 보고서와 판정 기록',
  },
  terrain_collision: {
    label: '지형 충돌 검증',
    request: '선택 훈련장의 지형·장애물과 부대 이동 경로의 충돌 여부를 검증하세요.',
    artifact: '충돌 검증 로그와 재현 화면 또는 캡처',
  },
  vehicle_collision: {
    label: '차량 충돌 검증',
    request: '차량 단위의 경로·장애물 충돌과 통과 가능 여부를 검증하세요.',
    artifact: '차량 충돌 검증 로그와 재현 화면 또는 캡처',
  },
  radio_propagation: {
    label: '통신 전파 검증',
    request: '훈련장 지형에서 통신 중계, 음영, 연결 유지 여부를 검증하세요.',
    artifact: '전파·통신 커버리지 검증 결과와 측정 자료',
  },
  render_alignment: {
    label: '렌더링 정합성 검증',
    request: '2D·3D 화면의 부대 위치·상태가 서버 기준 상태와 일치하는지 확인하세요.',
    artifact: '화면-상태 대조 캡처와 검증 로그',
  },
  identity_integration: {
    label: '부대·지휘관 식별자 정합성',
    request: '부대, 지휘관, 원본 프로필, 조직 계층 ID가 서로 정확히 연결되는지 확인하세요.',
    artifact: '식별자 매핑 결과와 조직 정합성 검증 로그',
  },
  closed_network_browser: {
    label: '폐쇄망 브라우저 검증',
    request: '외부 요청 없이 핵심 화면과 리허설·재생 경로가 동작하는지 검증하세요.',
    artifact: '폐쇄망 브라우저 감사 결과와 네트워크 캡처',
  },
  performance_endurance: {
    label: '성능·지속 운용 검증',
    request: '예정된 리허설 지속 시간과 부대 수에서 응답시간·메모리·프레임 안정성을 확인하세요.',
    artifact: '성능 측정 로그와 지속 운용 결과',
  },
  disaster_recovery: {
    label: '장애 복구 검증',
    request: '저장된 리허설·근거·조직 데이터를 백업에서 복구하고 재현되는지 확인하세요.',
    artifact: '복구 절차 로그와 복구 후 재현 결과',
  },
  approval_signature: {
    label: '운영 검증 승인',
    request: '검증 manifest를 승인 권한자가 확인하고 서명하세요.',
    artifact: '승인자 정보와 검증 manifest 서명',
  },
}

const EXTERNAL_GATE_CATALOG = {
  manifest: {
    label: '외부 assurance bundle 등록',
    request: '외부 승인기관이 서명한 다섯 gate bundle을 simulation의 assurance 디렉터리에 반입하세요.',
    artifact: '서명된 external_gates.json과 다섯 gate 증빙',
  },
  manifest_json: {
    label: '외부 assurance bundle JSON',
    request: '외부 승인기관이 서명한 JSON bundle이 스키마에 맞는지 확인하세요.',
    artifact: '정상 파싱되는 external_gates.json',
  },
  enterprise_identity: {
    label: '기업 식별자·권한 검증',
    request: '운영 IdP/PKI에서 발급자, 주체, 역할, 폐기 상태와 감사 로그를 확인하세요.',
    artifact: '외부 IdP/PKI 서명 assertion과 감사·폐기 증빙',
  },
  field_vehicle_calibration: {
    label: '현장 차량 보정 검증',
    request: '지정 차량·현장·빌드에서 측정값, 허용오차, 보정 결과를 확인하세요.',
    artifact: '차량 보정 측정 원본과 외부 장비 attestation',
  },
  field_radio_calibration: {
    label: '현장 무전 보정 검증',
    request: '지정 지형과 무전 장비에서 전파 측정·중계·음영 결과를 확인하세요.',
    artifact: '무전 측정 원본, 지형 바인딩, 외부 장비 attestation',
  },
  target_device_endurance: {
    label: '목표 장비 지속 운용 검증',
    request: '지정 GPU·드라이버·장비에서 요구 시간과 프레임·메모리 조건을 확인하세요.',
    artifact: '목표 장비 성능 캡처와 장비 attestation',
  },
  closed_operating_network: {
    label: '운영 폐쇄망 검증',
    request: '허용된 폐쇄망에서 외부 요청·오류·비밀 노출이 없는지와 서명 actor 흐름을 확인하세요.',
    artifact: '네트워크 캡처, 브라우저 감사 JSON, 서명 actor 감사 증빙',
  },
}

const MISSING_FIELD_LABELS = {
  record: '검증 manifest 기록',
  status: '검증 결과를 passed로 기록',
  evidence_artifact: '증빙 파일·로그 경로',
  content_hash: '증빙 파일의 SHA-256 해시',
}

const INPUT_REQUIREMENT_LABELS = {
  'communications.relay': '통신 중계 상태와 근거',
  'personnel.available': '가용 인원과 기준시각',
  'mobility.vehicle_available': '가용 차량과 운용 가능 여부',
  'sustainment.fuel': '연료 잔량과 보급 가능 여부',
  'sustainment.ammunition': '탄약 보유량과 재보급 가능 여부',
  'sustainment.equipment_status': '장비 상태와 운용 제한',
}

export function buildOperationalAssuranceRequirements(assurance = {}) {
  const blockingFields = Array.isArray(assurance.blocking_fields) ? assurance.blocking_fields : []
  const grouped = new Map()

  for (const rawField of blockingFields) {
    const field = String(rawField || '').trim()
    if (field === 'approval_signature') {
      grouped.set(field, new Set(['approval_signature']))
      continue
    }
    const externalMatch = /^external\.external_gates\.([^.]+)(?:\.(.+))?$/.exec(field)
    if (externalMatch) {
      const gate = externalMatch[1]
      const missingField = externalMatch[2] || 'record'
      const key = `external_gates.${gate}`
      if (!grouped.has(key)) grouped.set(key, new Set())
      grouped.get(key).add(missingField)
      continue
    }
    const match = /^validation\.([^.]+)(?:\.(.+))?$/.exec(field)
    if (!match) continue
    const domain = match[1]
    const missingField = match[2] || 'record'
    if (!grouped.has(domain)) grouped.set(domain, new Set())
    grouped.get(domain).add(missingField)
  }

  return [...grouped.entries()].map(([domain, missingFields]) => {
    const externalGate = domain.startsWith('external_gates.')
      ? domain.slice('external_gates.'.length)
      : null
    const catalog = (externalGate && EXTERNAL_GATE_CATALOG[externalGate]) || REQUIREMENT_CATALOG[domain] || {
      label: domain,
      request: '해당 검증 영역의 통과 여부를 확인하세요.',
      artifact: '검증 보고서 또는 실행 로그',
    }
    return {
      domain,
      ...catalog,
      missing: [...missingFields].map((field) => MISSING_FIELD_LABELS[field] || field),
    }
  })
}

export function describeDecisionInputRequirement(field) {
  const normalized = String(field || '').trim()
  return INPUT_REQUIREMENT_LABELS[normalized] || normalized
}
