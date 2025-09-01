from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.template.loader import render_to_string
from django.core.paginator import Paginator
from collections import Counter
from django.db.models import Q
import re

# -------------------- Article-related imports (unchanged) --------------------
from article.models import Cuser, Articles
from rest_framework.response import Response
from article.serializers import ArticleSerializer
from rest_framework import viewsets, filters
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny

# -------------------- API ViewSet (unchanged) --------------------
class ArticleHybridViewSet(viewsets.ModelViewSet):
    queryset = Articles.objects.all()
    serializer_class = ArticleSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'content']

    def get_permissions(self):
        if self.action in ['search_articles']:
            return [AllowAny()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'], url_path='search')
    @permission_classes([AllowAny])
    def search_articles(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

# -------------------- Register --------------------
def register(request):
    if request.method == 'POST':
        name = request.POST.get('name')
        email = request.POST.get('email')
        password = request.POST.get('password')
        phone = request.POST.get('phone')

        if Cuser.objects.filter(email=email).exists():
            return JsonResponse({"success": False, "message": "Email already registered!"})
        if Cuser.objects.filter(username=name).exists():
            return JsonResponse({"success": False, "message": "Username already taken!"})

        user = Cuser(username=name, email=email, phone=phone)
        user.set_password(password)
        user.save()
        
        return JsonResponse({"success": True, "message": "Registration successful!", "redirect": "login"})

    html = render_to_string('register.html', {}, request=request)
    return JsonResponse({"success": True, "login": html})

# -------------------- Login --------------------
def login(request):
    if request.user.is_authenticated:
        return JsonResponse({"success": True, "message": "You are already logged in.", "redirect": "article"})

    if request.method == 'POST':
        email = request.POST.get('email')
        password = request.POST.get('password')
        user = authenticate(request, username=email, password=password)

        if user:
            auth_login(request, user)
            return JsonResponse({"success": True, "message": "Login successful!", "redirect": "article"})
        else:
            return JsonResponse({"success": False, "message": "Invalid email or password."})

    html = render_to_string('login.html', {}, request=request)
    return JsonResponse({"success": True, "article": html})

# -------------------- Logout --------------------
def logout(request):
    auth_logout(request)
    return JsonResponse({"success": True, "message": "You have been logged out.", "redirect": "article"})

# -------------------- Article List --------------------
def article(request):
    user = request.user if request.user.is_authenticated else None
    search_query = request.GET.get('search', '').strip()
    articles_qs = Articles.objects.filter(is_draft=False).select_related('author').order_by('-created_at')

    if search_query:
        escaped_query = re.escape(search_query)
        articles_qs = articles_qs.filter(
            Q(title__iregex=rf'\b{escaped_query}\b') | Q(content__iregex=rf'\b{escaped_query}\b')
        )

    paginator = Paginator(articles_qs, 5)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'articles': list(page_obj.object_list.values(
            'id', 'title', 'content', 'tags', 'created_at', 'author__username'
        )),
        'user_name': user.username if user else None,
        'is_logged_in': bool(user),
        'page_obj': {
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'number': page_obj.number,
            'total_pages': paginator.num_pages,
        },
        'search_query': search_query,
    }

    all_tags_flat = []
    for art in Articles.objects.filter(is_draft=False):
        all_tags_flat.extend([tag.strip() for tag in art.tags.split(',') if tag.strip()])
    context['tag_counts_list'] = sorted(Counter(all_tags_flat).items())
    context['all_tags'] = sorted(set(all_tags_flat))

    has_drafts = Articles.objects.filter(author=user, is_draft=True).exists() if user else False
    context['has_drafts'] = has_drafts
    context['no_drafts'] = not has_drafts

    html_content = render_to_string('article.html', context, request=request)
    return JsonResponse({"success": True, "html": html_content, "data": context})

# -------------------- Save/Add/Edit Article --------------------
@login_required(login_url='login')
def save_article(request, article_id=None):
    user = request.user
    article = get_object_or_404(Articles, id=article_id, author=user) if article_id else None

    if request.method == 'POST':
        action = request.POST.get('action')
        title = request.POST.get('title')
        content = request.POST.get('content')
        tags = request.POST.get('tags')

        if action == 'cancel':
            redirect_to = 'draft_article' if article and article.is_draft else 'article'
            return JsonResponse({'success': True, 'redirect': redirect_to})

        if action == 'delete' and article:
            article.delete()
            return JsonResponse({"success": True, "message": "Article deleted!", "redirect": "draft_article"})

        is_draft = (action == 'draft')

        if article:
            article.title = title
            article.content = content
            article.tags = tags
            article.is_draft = is_draft
            article.save()
            message = "Draft saved!" if is_draft else "Article updated successfully!"
        else:
            article = Articles.objects.create(
                title=title,
                content=content,
                tags=tags,
                author=user,
                is_draft=is_draft
            )
            message = "Draft saved!" if is_draft else "Article published successfully!"
        
        redirect_to = 'draft_article' if is_draft else 'article'
        return JsonResponse({'success': True, 'message': message, 'redirect': redirect_to})

    context = {'article': article}
    html_content = render_to_string('add_article.html', context, request=request)
    return JsonResponse({"success": True, "html": html_content})

# -------------------- Draft Articles --------------------
@login_required(login_url='login')
def draft_article(request):
    drafts_qs = Articles.objects.filter(author=request.user, is_draft=True).order_by('-created_at')
    has_drafts = drafts_qs.exists()
    
    processed_drafts = list(drafts_qs.values(
        'id', 'title', 'content', 'tags', 'created_at', 'author__username'
    ))

    context = {
        'articles': processed_drafts,
        'is_logged_in': True,
        'user_name': request.user.username,
        'is_draft_page': True,
        'has_drafts': has_drafts,
        'no_drafts': not has_drafts,
    }

    html_content = render_to_string('draft_article.html', context, request=request)
    return JsonResponse({"success": True, "html": html_content, "data": context})

# -------------------- Tags --------------------
def tags(request, tag):
    user = request.user if request.user.is_authenticated else None
    
    all_articles = Articles.objects.filter(is_draft=False).select_related('author')
    all_tags_flat = []
    matched_articles = []
    normalized_tag = tag.lower()

    for article_obj in all_articles:
        tag_list = [t.strip() for t in article_obj.tags.split(',') if t.strip()]
        all_tags_flat.extend(tag_list)
        if normalized_tag in [t.lower() for t in tag_list]:
            matched_articles.append({
                'id': article_obj.id,
                'title': article_obj.title,
                'content': article_obj.content,
                'tags': article_obj.tags,
                'tag_list': tag_list,
                'author_name': article_obj.author.username,
                'created_at': article_obj.created_at,
            })
    
    tag_counts_list = sorted(Counter(all_tags_flat).items())
    
    context = {
        'articles': matched_articles,
        'user_name': user.username if user else None,
        'is_logged_in': user is not None,
        'selected_tag': tag,
        'all_tags': sorted(set(all_tags_flat)),
        'tag_counts_list': tag_counts_list,
    }

    html_content = render_to_string('article.html', context, request=request)
    return JsonResponse({"success": True, "html": html_content, "data": context})