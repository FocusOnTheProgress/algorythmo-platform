# frozen_string_literal: true

# algorythmo:brain:smoke_ollama — Day-0 BYOK embedding diagnostic.
#
# Validates that the Ollama instance configured for the Brain is reachable,
# that the embedding model is loaded, and that each test query returns a
# well-formed embedding vector of the expected dimensionality.
#
# Decision D-OQ5 (docs/plans/0004-m3-brain-mvp.md §2):
#   Embedding provider = Ollama local, model nomic-embed-text (768 dims).
#
# ENV config (both have safe defaults for local dev):
#   ALGORYTHMO_BRAIN_EMBEDDING_HOST  — default http://localhost:11434
#   ALGORYTHMO_BRAIN_EMBEDDING_MODEL — default nomic-embed-text
#
# Usage:
#   bundle exec rake algorythmo:brain:smoke_ollama
#
# Founder dogfooding: run this before the first gbrain capture to confirm
# Ollama is warm and the model is pulled. Output is terminal-friendly with
# ANSI color, alignment, and a summary box — no external deps beyond stdlib.

require 'net/http'
require 'json'
require 'uri'

module Algorythmo
  module Tasks
    # Isolated diagnostic — intentionally does NOT import Brain::Client.
    # This task validates connectivity; the Client handles subprocess lifecycle.
    class SmokeOllama
      EXPECTED_DIM = 768
      TIMEOUT_SECS = 5

      # 10 PT-BR queries covering the Algorythmo OS knowledge domains:
      # pricing, ICP, tone/brand, objection handling, and deadlines.
      QUERIES = [
        'Qual é a política de preços da Algorythmo para PMEs?',
        'Quem é o cliente ideal da Algorythmo (ICP)?',
        'Como a Algorythmo responde a objeções sobre ROI?',
        'Qual o tom de comunicação da Algorythmo com clientes?',
        'Como lidar com um lead que pede desconto agressivo?',
        'Qual o prazo típico de onboarding de um novo cliente?',
        'O que diferencia a Algorythmo de concorrentes no mercado PME?',
        'Como qualificar um lead que veio pelo Instagram?',
        'Qual a mensagem de follow-up após uma demo sem resposta?',
        'Como escalar atendimento sem perder qualidade com IA?'
      ].freeze

      # ANSI helpers — gracefully degrades when TTY is absent.
      GREEN  = "\e[32m"
      RED    = "\e[31m"
      YELLOW = "\e[33m"
      BOLD   = "\e[1m"
      DIM    = "\e[2m"
      RESET  = "\e[0m"

      def self.run!(host:, model:, output: $stdout)
        new(host: host, model: model, output: output).run!
      end

      def initialize(host:, model:, output:)
        @host   = host
        @model  = model
        @output = output
        @uri    = URI.join(host, '/api/embeddings')
      end

      def run!
        print_header
        results = QUERIES.map.with_index(1) { |query, idx| probe(query, idx) }
        print_summary(results)
        raise 'smoke_ollama: one or more queries failed' if results.any? { |r| r[:error] }
      end

      private

      def probe(query, idx)
        started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
        embedding = fetch_embedding(query)
        elapsed_ms = elapsed_since(started)

        validate_result(query, idx, embedding, elapsed_ms)
      rescue Errno::ECONNREFUSED
        print_row(idx, query, nil, :offline)
        { error: :offline }
      rescue Net::ReadTimeout, Net::OpenTimeout
        print_row(idx, query, nil, :timeout)
        { error: :timeout }
      rescue RuntimeError => e
        print_row(idx, query, nil, e.message)
        { error: e.message }
      end

      def fetch_embedding(query)
        http = Net::HTTP.new(@uri.host, @uri.port)
        http.open_timeout = TIMEOUT_SECS
        http.read_timeout = TIMEOUT_SECS

        request = Net::HTTP::Post.new(@uri.path, 'Content-Type' => 'application/json')
        request.body = JSON.generate(model: @model, prompt: query)

        response = http.request(request)

        raise "HTTP #{response.code}" if response.code == '404'
        raise "HTTP #{response.code}" unless response.code == '200'

        body = JSON.parse(response.body)
        raise 'missing embedding key' unless body.key?('embedding')

        body['embedding']
      end

      def validate_result(query, idx, embedding, elapsed_ms)
        if elapsed_ms > TIMEOUT_SECS * 1000
          print_row(idx, query, elapsed_ms, :slow)
          return { error: :slow, ms: elapsed_ms }
        end

        dim = embedding.length
        if dim != EXPECTED_DIM
          print_row(idx, query, elapsed_ms, "dim=#{dim}")
          return { error: :wrong_dim, ms: elapsed_ms, dim: dim }
        end

        print_row(idx, query, elapsed_ms, :ok)
        { ms: elapsed_ms }
      end

      def print_header
        @output.puts
        @output.puts "#{BOLD}  algorythmo:brain:smoke_ollama#{RESET}"
        @output.puts "#{DIM}  host=#{@host}  model=#{@model}  queries=#{QUERIES.size}#{RESET}"
        @output.puts
        @output.puts '  #   Query                                                    Latency   Status'
        @output.puts "  #{'-' * 80}"
      end

      def print_row(index, query, elapsed_ms, status)
        truncated = query.length > 54 ? "#{query[0, 51]}..." : query.ljust(55)
        latency   = elapsed_ms ? format('%<ms>6dms', ms: elapsed_ms.round) : '       -'

        status_str = case status
                     when :ok      then "#{GREEN}✓#{RESET}"
                     when :offline then "#{RED}✗ Ollama offline#{RESET}"
                     when :timeout then "#{RED}✗ timeout#{RESET}"
                     when :slow    then "#{YELLOW}✗ >#{TIMEOUT_SECS}s#{RESET}"
                     else               "#{RED}✗ #{status}#{RESET}"
                     end

        @output.puts format('  %<idx>2d  %<q>-55s  %<lat>s  %<st>s',
                            idx: index, q: truncated, lat: latency, st: status_str)
      end

      def print_summary(results)
        passed   = results.count { |r| !r[:error] }
        failed   = results.size - passed
        times    = results.filter_map { |r| r[:ms] }
        avg_ms   = times.empty? ? 0 : (times.sum / times.size).round
        max_ms   = times.empty? ? 0 : times.max.round

        @output.puts "  #{'-' * 80}"
        @output.puts
        color = failed.zero? ? GREEN : RED
        @output.puts "#{BOLD}  #{color}#{passed}/#{results.size} passed#{RESET}  " \
                     "avg #{avg_ms}ms  max #{max_ms}ms"
        @output.puts
      end

      def elapsed_since(started)
        ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started) * 1000).round(1)
      end
    end
  end
end

namespace :algorythmo do
  namespace :brain do
    desc 'Day-0 BYOK smoke test: 10 PT-BR queries against Ollama nomic-embed-text (D-OQ5)'
    task smoke_ollama: :environment do
      host  = ENV.fetch('ALGORYTHMO_BRAIN_EMBEDDING_HOST', 'http://localhost:11434')
      model = ENV.fetch('ALGORYTHMO_BRAIN_EMBEDDING_MODEL', 'nomic-embed-text')

      Algorythmo::Tasks::SmokeOllama.run!(host: host, model: model)
    rescue RuntimeError => e
      abort(e.message)
    end
  end
end
