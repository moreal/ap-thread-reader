---
name: node-perf
description: Node.js 성능 프로파일링 및 분석. --prof 플래그로 CPU 프로파일을 생성하고 병목 지점을 찾아 최적화를 제안합니다.
argument-hint: [URL]
allowed-tools: Bash(timeout 120 yarn node --prof --import tsx scripts/cli.ts *), Bash(node --prof-process *), Bash(ls -t isolate-*.log *), Bash(rm isolate-*.log), Read, Glob, Task
---

# Node.js Performance Profiling Skill

이 스킬은 Node.js `--prof` 플래그를 사용하여 성능을 측정하고 분석합니다.

## 실행 단계

### Step 1: 프로파일 데이터 생성

프로파일링을 실행합니다:

```bash
timeout 120 yarn node --prof --import tsx scripts/cli.ts $0
```

- `timeout 120`: 무한 대기 방지 (2분 제한)
- `--prof`: V8 프로파일링 활성화
- `$0`: 사용자가 제공한 URL 인자

### Step 2: 프로파일 파일 찾기

가장 최근 생성된 isolate 로그 파일을 찾습니다:

```bash
ls -t isolate-*.log | head -1
```

### Step 3: 프로파일 처리

프로파일을 사람이 읽을 수 있는 형태로 변환합니다:

```bash
node --prof-process <isolate-file> > /path/to/scratchpad/profile-result.txt
```

결과 파일은 **scratchpad 디렉토리**에 저장하여 프로젝트를 오염시키지 않습니다.

### Step 4: Subagent로 분석 (중요)

**반드시 Task 도구를 사용하여 subagent에게 분석을 위임합니다.**

Task 도구 호출 시:
- `subagent_type`: "general-purpose"
- 프로파일 결과 파일 경로를 전달
- 다음 분석 항목을 요청:

#### Subagent 분석 요청 내용

1. **상위 시간 소비 함수** (>5% tick)
2. **GC(Garbage Collection) 오버헤드**
3. **라이브러리 vs 애플리케이션 코드 비율**
4. **최적화 가능한 핫스팟**
5. **구체적인 개선 제안**

### Step 5: 정리

분석이 완료되면 생성된 isolate 로그 파일을 삭제합니다:

```bash
rm isolate-*.log
```

## 출력 형식

Subagent의 분석 결과를 사용자에게 다음 형식으로 요약하여 전달합니다:

```
## 프로파일 분석 결과

### 주요 병목 지점
- ...

### GC 오버헤드
- ...

### 최적화 제안
1. ...
2. ...
```

## 에러 처리

- isolate 파일이 생성되지 않은 경우: 프로파일링 실행 실패 메시지 출력
- timeout 발생 시: 적절한 안내 메시지 출력
- node --prof-process 실패 시: 원본 로그 파일 내용 확인 시도
