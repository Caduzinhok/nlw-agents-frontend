import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateQuestionRequest } from './types/create-question-request'
import type { CreateQuestionResponse } from './types/create-question-response'
import type { GetRoomsQuestionsAPIResponse } from './types/get-room-questions-respose'

export function useCreateQuestion(roomId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateQuestionRequest) => {
      const response = await fetch(
        `http://localhost:3333/rooms/${roomId}/questions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      )

      const result: CreateQuestionResponse = await response.json()

      return result
    },

    // Executa no momento que for feita a chamada p/ API
    onMutate({ question }) {
      const questions = queryClient.getQueryData<GetRoomsQuestionsAPIResponse>([
        'get-questions',
        roomId,
      ])
      const newQuestion = {
        id: crypto.randomUUID(),
        question,
        answer: null,
        createdAt: new Date().toISOString(),
        isGeneratingAnswer: true,
      }
      const questionsArray = questions ?? []
      queryClient.setQueryData<GetRoomsQuestionsAPIResponse>(
        ['get-questions', roomId],
        [newQuestion, ...questionsArray]
      )

      return { newQuestion, questions }
    },
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData<GetRoomsQuestionsAPIResponse>(
        ['get-questions', roomId],
        (questions) => {
          if (!questions) {
            return questions
          }

          if (!context.newQuestion) {
            return questions
          }

          return questions?.map((question) => {
            if (question.id === context.newQuestion.id) {
              return {
                ...context.newQuestion,
                id: data.questionId,
                answer: data.answer,
                isGeneratingAnswer: false,
              }
            }

            return question
          })
        }
      )
    },
    onError: (error, variable, context) => {
      if (context?.questions) {
        queryClient.setQueryData<GetRoomsQuestionsAPIResponse>(
          ['get-questions', roomId],
          context.questions
        )
      }
    },
  })
}
