# Effects Bundle

집중포격, 탄도, 폭발 연출에 쓰는 공용 VFX 리소스를 이 번들에서 관리합니다.

- `textures/`: 런타임에서 바로 읽는 폭발, 연기, 플래시 같은 텍스처
- `libraries/`: Kenney 같은 외부 팩 원본과 라이선스 파일

운영 규칙:

- 실제 렌더링 코드가 쓰는 파일은 `textures/` 아래에 둡니다.
- `textures/focus-fire/`는 집중포격 시뮬레이션에서 바로 쓰는 canonical 텍스처 세트입니다.
- 외부에서 받은 원본 팩은 가능한 한 라이선스 파일과 함께 `libraries/`에 보관합니다.
- 특정 시뮬레이터용으로 선별한 텍스처는 원본을 유지한 채 `textures/`로 복사하거나 이동해 canonical 경로를 만듭니다.
