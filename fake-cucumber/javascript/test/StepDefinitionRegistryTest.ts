import assert from 'assert'
import { stubConstructor } from 'ts-sinon'
import { messages } from 'cucumber-messages'

import SupportCodeExecutor from '../src/SupportCodeExecutor'
import StepDefinition from '../src/StepDefinition'
import StepDefinitionRegistry from '../src/StepDefinitionRegistry'

describe('StepDefinitionRegistry', () => {
  describe('#execute', () => {
    it('returns UNDEFINED when there are no matching step definitions', () => {
      const registry = new StepDefinitionRegistry([])
      const testStep = registry.createTestStep('an undefined step', 'step-id')
      const testStepFinished = testStep.execute()
      assert.strictEqual(
        testStepFinished.testResult.status,
        messages.TestResult.Status.UNDEFINED
      )
      assert.strictEqual(testStepFinished.testStepId, testStep.id)
    })

    it('returns AMBIGUOUS when there are multiple matching step definitions', () => {
      const registry = new StepDefinitionRegistry([
        stubMatchingStepDefinition(),
        stubMatchingStepDefinition(),
      ])
      const testStep = registry.createTestStep('an ambiguous step', 'step-id')
      const testStepFinished = testStep.execute()
      assert.strictEqual(
        testStepFinished.testResult.status,
        messages.TestResult.Status.AMBIGUOUS
      )
      assert.strictEqual(testStepFinished.testStepId, testStep.id)
    })

    context('when there is a matching step definition', () => {
      it('returns PASSED when the match execution raises no exception', () => {
        const registry = new StepDefinitionRegistry([
          stubMatchingStepDefinition(stubPassingSupportCodeExecutor()),
        ])
        const testStep = registry.createTestStep('a passed step', 'step-id')
        const testStepFinished = testStep.execute()

        assert.strictEqual(
          testStepFinished.testResult.status,
          messages.TestResult.Status.PASSED
        )
        assert.strictEqual(testStepFinished.testStepId, testStep.id)
      })


      it('bubbles up the error when the match execution raises one', () => {
        const registry = new StepDefinitionRegistry([
          stubMatchingStepDefinition(
            stubFailingSupportCodeExecutor('This step has failed')
          ),
        ])

        const testStep = registry.createTestStep('a failed step', 'step-id')
        const testStepFinished = testStep.execute()
        assert.strictEqual(
          testStepFinished.testResult.status,
          messages.TestResult.Status.FAILED
        )
        assert.strictEqual(testStepFinished.testStepId, testStep.id)
      })
    })
  })

  describe('#toMessages', () => {
    it('wraps each stepDefinitions.toMessages in an Envelope', () => {
      const stepDef1 = stubMatchingStepDefinition()
      const stepDef2 = stubMatchingStepDefinition()

      const registry = new StepDefinitionRegistry([stepDef1, stepDef2])
      assert.deepStrictEqual(registry.toMessages(), [
        new messages.Envelope({
          stepDefinitionConfig: stepDef1.toMessage(),
        }),
        new messages.Envelope({
          stepDefinitionConfig: stepDef2.toMessage(),
        }),
      ])
    })
  })

  function stubPassingSupportCodeExecutor(): SupportCodeExecutor {
    const supportCodeExecutorStub = stubConstructor<SupportCodeExecutor>(
      SupportCodeExecutor
    )
    supportCodeExecutorStub.execute.returns('ok')

    return supportCodeExecutorStub
  }

  function stubFailingSupportCodeExecutor(
    message: string
  ): SupportCodeExecutor {
    const supportCodeExecutorStub = stubConstructor<SupportCodeExecutor>(
      SupportCodeExecutor
    )
    supportCodeExecutorStub.execute.throws(new Error(message))

    return supportCodeExecutorStub
  }

  function stubMatchingStepDefinition(
    executor: SupportCodeExecutor = new SupportCodeExecutor(
      'some-id',
      () => null,
      []
    )
  ): StepDefinition {
    const stepDefinitionStub = stubConstructor<StepDefinition>(StepDefinition)
    stepDefinitionStub.match.returns(executor)

    return stepDefinitionStub
  }
})
