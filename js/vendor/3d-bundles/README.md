# 3D Bundle Library

이 폴더는 VISTA에서 쓰는 3D 모델을 종류별로 모아두는 공용 보관함입니다.

- `drone/models`: 드론 GLB, GLTF, FBX 같은 비행 자산
- `aircraft/models`: 전투기, 헬기 같은 일반 항공 자산
- `artillery/models`: 포, 자주포, 견인포 같은 화포 자산
- `tank/models`: 전차, 장갑차 같은 지상 자산
- `ships/`: 함정, 잠수함 같은 해상 자산
- `infrastructure/models`: 격납고, 관제탑, 급유차, 컨테이너 같은 기지/지원 프롭
- `effects/`: 폭발, 연기, 화염, 트레일 같은 공용 VFX 텍스처와 라이브러리
- `viewer/`: 자산 상세와 몰입형 화면에서 공용으로 쓰는 3D 뷰어
- `etc/`: 새로 받은 자산을 분류 전 잠시 올려두는 임시 적재소

운영 규칙:

- 드론 전용 모델은 `drone/models`에 넣고, 일반 항공기와 헬기는 `aircraft/models`에 넣습니다.
- 포, 자주포, 견인포, 로켓, 미사일 GLB는 `artillery/models`에서 관리합니다.
- 기지 인프라와 보조 프롭은 `infrastructure/models`에 두고, 항공/기지 쇼룸의 보조 씬으로만 사용합니다.
- 폭발 PNG, 연기 스프라이트, 외부 VFX 팩은 `effects/` 아래에서 관리합니다.
- `flight-sim`은 모델을 `public/3d-bundles`에서 직접 읽습니다. 관리 기준 폴더는 `flight-sim/assets/models`가 아니라 이 폴더입니다.
- 자산 상세와 몰입형 화면은 자산 이름을 보고 이 폴더 안에서 가장 가까운 3D 모델을 자동으로 골라서 보여줍니다.
- 포와 탱크 폴더는 다른 시뮬레이터나 뷰어를 붙일 때 같은 방식으로 바로 확장할 수 있게 미리 만들어 둔 구조입니다.
- `etc/`에 들어온 파일은 검수 후 실제 번들 경로로 옮기고, 런타임에서는 `etc/`를 직접 참조하지 않습니다.
