import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // 앱은 App Router의 async 서버 컴포넌트가 대부분이며, 요청 시각을 얻기 위한
      // new Date()/Date.now() 사용은 서버에서 요청당 1회 실행되어 안전하다.
      // react-hooks/purity 는 클라이언트 렌더 순수성을 위한 규칙으로, RSC의
      // 요청 시각 계산에 오탐이 발생하므로 비활성화한다.
      // (실제 클라이언트 버그를 잡는 react-hooks/set-state-in-effect 등은 유지)
      "react-hooks/purity": "off",
    },
  },
]);

export default eslintConfig;
